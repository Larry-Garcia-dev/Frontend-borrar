import { ReportRepository } from '../repositories/report.repository';
import { UserRepository } from '../repositories/user.repository';

export class ReportService {
  static async getPendingReports() {
    const reports = await ReportRepository.getPendingReports();
    return reports.map(r => ({
      ...r,
      created_at: r.created_at.toISOString(),
      reviewed_at: r.reviewed_at ? r.reviewed_at.toISOString() : null
    }));
  }

  static async approveReport(reportId: string) {
    const report = await ReportRepository.findReportById(reportId);
    if (!report || report.status !== 'PENDING') throw new Error("Reporte inválido o ya procesado");

    const user = await UserRepository.findUserById(report.user_id);
    if (user && !user.is_unlimited && user.used_quota > 0) {
      await UserRepository.updateUser(user.id, { used_quota: user.used_quota - 1 });
    }

    return ReportRepository.updateReportStatus(reportId, 'APPROVED');
  }

  static async rejectReport(reportId: string, adminNote?: string) {
    return ReportRepository.updateReportStatus(reportId, 'REJECTED', adminNote);
  }
}