import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { getNextSequence } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: any = { isActive: true };
    
    if (category) {
      // Check if it's a UUID (custom category) or enum value (default category)
      if (category.includes('-')) {
        where.categoryId = category;
      } else {
        where.category = category;
      }
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          analyticalAccount: true,
          categoryRef: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validation: Sale price should not be less than purchase price
    if (body.salePrice < body.purchasePrice) {
      return NextResponse.json({ 
        error: 'Sale Price cannot be less than Purchase Price' 
      }, { status: 400 });
    }
    
    const code = await getNextSequence('product');

    // Determine if categoryId is a custom category UUID or default enum
    const isCustomCategory = body.categoryId && body.categoryId.includes('-');
    
    const product = await prisma.product.create({
      data: {
        code,
        name: body.name,
        description: body.description,
        category: isCustomCategory ? 'CUSTOM' : (body.categoryId || 'RAW_MATERIAL'),
        categoryId: isCustomCategory ? body.categoryId : null,
        unit: body.unit || 'PCS',
        purchasePrice: body.purchasePrice,
        salePrice: body.salePrice,
        taxRate: body.taxRate || 18,
        hsnCode: body.hsnCode,
        analyticalAccountId: body.analyticalAccountId,
      },
      include: {
        analyticalAccount: true,
        categoryRef: true,
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
