import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { getNextSequence } from '@/lib/utils';
import { sendEmail, generateInviteEmail, generateToken } from '@/lib/email';
import { UserRole } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: any = { isActive: true };
    
    // Normalize type to uppercase for comparison
    const normalizedType = type?.toUpperCase();
    
    if (normalizedType && ['CUSTOMER', 'VENDOR', 'BOTH'].includes(normalizedType)) {
      if (normalizedType === 'CUSTOMER') {
        where.type = { in: ['CUSTOMER', 'BOTH'] };
      } else if (normalizedType === 'VENDOR') {
        where.type = { in: ['VENDOR', 'BOTH'] };
      } else {
        where.type = normalizedType;
      }
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // If customer role, only show their own contact
    if (user.role === 'CUSTOMER' && user.contactId) {
      where.id = user.contactId;
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              password: true,
            },
          },
        },
      }),
      prisma.contact.count({ where }),
    ]);

    // Transform contacts to include account status
    const contactsWithStatus = contacts.map((contact: any) => ({
      ...contact,
      accountStatus: contact.user 
        ? (contact.user.password ? 'ACTIVE' : 'PENDING') 
        : 'NO_ACCOUNT',
      user: undefined, // Remove user object from response
    }));

    return NextResponse.json({
      contacts: contactsWithStatus,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const code = await getNextSequence('contact');

    const contact = await prisma.contact.create({
      data: {
        code,
        name: body.name,
        type: body.type,
        email: body.email,
        phone: body.phone,
        address: body.address,
        city: body.city,
        state: body.state,
        country: body.country || 'India',
        pincode: body.pincode,
        gstin: body.gstin,
        pan: body.pan,
        creditLimit: body.creditLimit,
        paymentTerms: body.paymentTerms || 30,
      },
    });

    // Auto-send invite email if contact has email (for both vendors and customers)
    if (body.email) {
      try {
        const token = generateToken();
        const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        const role = (body.type === 'VENDOR' ? 'VENDOR' : 'CUSTOMER') as UserRole;

        // Check if user with this email already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: body.email },
        });

        if (existingUser) {
          // Update existing user to link with this contact
          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              contactId: contact.id,
              inviteToken: token,
              inviteExpires: expires,
              role: role,
            },
          });
        } else {
          // Create new user
          await prisma.user.create({
            data: {
              email: body.email,
              name: body.name,
              role: role,
              contactId: contact.id,
              inviteToken: token,
              inviteExpires: expires,
              password: null,
            },
          });
        }

        const inviteLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/setup-account?token=${token}`;
        const emailHtml = generateInviteEmail(body.name, inviteLink, body.type);

        await sendEmail({
          to: body.email,
          subject: 'Welcome to Shiv Furniture - Set Up Your Account',
          html: emailHtml,
        });

        console.log(`✅ Invite email sent to ${body.type}: ${body.email}`);
      } catch (emailError) {
        console.error('Failed to send invite email:', emailError);
        // Don't fail the contact creation if email fails
      }
    }

    return NextResponse.json({ contact }, { status: 201 });
  } catch (error) {
    console.error('Error creating contact:', error);
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 });
  }
}
