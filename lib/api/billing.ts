import { BaseAPIClient } from './core';
import { UserBalance, BillingRecord, BillingSummary, ActivityLog } from './types';

export const createBillingApi = (client: BaseAPIClient) => ({
  async getMyBalance(): Promise<UserBalance> {
    return client.request<UserBalance>("/billing/my-balance");
  },
  async getMyBillingRecords(recordType?: string): Promise<BillingRecord[]> {
    const query = recordType ? `?record_type=${recordType}` : "";
    return client.request<BillingRecord[]>(`/billing/my-records${query}`);
  },
  async getUserBillingSummary(userId: string): Promise<BillingSummary> {
    return client.request<BillingSummary>(`/billing/users/${userId}/summary`);
  },
  async getAllBalances(): Promise<Array<{ user: { id: string; email: string; name?: string; role: string }; balance: UserBalance }>> {
    return client.request("/billing/all-balances");
  },
  async recordPayment(userId: string, amount: number, description: string): Promise<BillingRecord> {
    return client.request<BillingRecord>("/billing/record-payment", { method: "POST", body: JSON.stringify({ user_id: userId, amount_usd: amount, description }) });
  },
  async recordAdjustment(userId: string, amount: number, description: string): Promise<BillingRecord> {
    return client.request<BillingRecord>("/billing/record-adjustment", { method: "POST", body: JSON.stringify({ user_id: userId, amount_usd: amount, description }) });
  },
  async getActivityLog(action?: string, userId?: string): Promise<ActivityLog[]> {
    const params = new URLSearchParams();
    if (action) params.set("action", action);
    if (userId) params.set("user_id", userId);
    const query = params.toString() ? `?${params.toString()}` : "";
    return client.request<ActivityLog[]>(`/billing/activity-log${query}`);
  }
});