import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminOnly } from '@/middleware/rbac';
import { Errors, errorResponse } from '@/middleware/errorHandler';
import { parseCategoryImport } from '@/modules/import-export/excel.service';

export const POST = adminOnly(async (req: NextRequest, ctx) => {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) throw Errors.notFound('File');

    const buffer = Buffer.from(await file.arrayBuffer());
    const { rows, errors: parseErrors } = parseCategoryImport(buffer);

    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: { created: 0, errors: parseErrors.length > 0 ? parseErrors : [{ row: 0, message: 'No valid rows found in file' }] },
      });
    }

    // Build a slug→id lookup for parent references
    const existingSlugs = await prisma.category.findMany({ select: { id: true, slug: true } });
    const slugMap = new Map(existingSlugs.map(c => [c.slug, c.id]));

    let created = 0;
    const createErrors: { row: number; message: string }[] = [...parseErrors];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      try {
        const slug = row.slug || row.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        // Check if slug already exists
        if (slugMap.has(slug)) {
          createErrors.push({ row: rowNum, message: `Category slug "${slug}" already exists` });
          continue;
        }

        // Resolve parent by slug
        let parentId: string | null = null;
        if (row.parentSlug) {
          parentId = slugMap.get(row.parentSlug) || null;
          if (!parentId) {
            createErrors.push({ row: rowNum, message: `Parent slug "${row.parentSlug}" not found` });
            continue;
          }
        }

        const cat = await prisma.category.create({
          data: {
            name: row.name,
            slug,
            parentId,
            imageUrl: row.imageUrl || null,
            sortOrder: row.sortOrder || 0,
            isActive: true,
            approvalStatus: 'approved',
            approvedBy: ctx.userId,
            approvedAt: new Date(),
          },
        });

        // Add to lookup so subsequent rows can reference this as parent
        slugMap.set(cat.slug, cat.id);
        created++;
      } catch (err) {
        createErrors.push({
          row: rowNum,
          message: err instanceof Error ? err.message : 'Failed to create category',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: { created, errors: createErrors },
    });
  } catch (error) {
    return errorResponse(error);
  }
});
