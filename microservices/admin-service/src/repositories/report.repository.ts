import { prisma } from './prisma.client';

export class ReportRepository {
  static async getPendingReports() {
    return prisma.imageReport.findMany({
      where: { status: 'PENDING' },
      orderBy: { created_at: 'asc' }
    });
  }

  static async findReportById(id: string) {
    return prisma.imageReport.findUnique({ where: { id } });
  }

  static async updateReportStatus(id: string, status: string, adminNote?: string) {
    return prisma.imageReport.update({
      where: { id },
      data: { status, admin_note: adminNote || null, reviewed_at: new Date() }
    });
  }
}