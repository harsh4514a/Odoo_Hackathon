import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, isAdmin } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        analyticalAccount: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Validation: Sale price should not be less than purchase price
    if (body.salePrice !== undefined && body.purchasePrice !== undefined) {
      if (body.salePrice < body.purchasePrice) {
        return NextResponse.json({ 
          error: 'Sale Price cannot be less than Purchase Price' 
        }, { status: 400 });
      }
    }

    // Determine if categoryId is a custom category UUID or default enum
    const isCustomCategory = body.categoryId && body.categoryId.includes('-');

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        category: isCustomCategory ? 'CUSTOM' : (body.categoryId || undefined),
        categoryId: isCustomCategory ? body.categoryId : null,
        unit: body.unit,
        purchasePrice: body.purchasePrice,
        salePrice: body.salePrice,
        taxRate: body.taxRate,
        hsnCode: body.hsnCode,
        analyticalAccountId: body.analyticalAccountId,
        isActive: body.isActive,
      },
      include: {
        analyticalAccount: true,
        categoryRef: true,
      },
    });

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
