import { apiClient, authStorage } from './client';

// ============================================================================
// AUTH API
// ============================================================================
export const authApi = {
  register: (data: { firstName: string; lastName: string; email: string; password: string }) =>
    apiClient('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  login: async (data: { email: string; password: string }) => {
    const res = await apiClient<{
      user: any;
      accessToken: string;
      refreshToken: string;
    }>('/auth/login', { method: 'POST', body: JSON.stringify(data) });
    if (res.accessToken) authStorage.setToken(res.accessToken);
    if (res.refreshToken) authStorage.setRefreshToken(res.refreshToken);
    return res;
  },

  logout: async () => {
    try {
      await apiClient('/auth/logout', { method: 'POST' });
    } finally {
      authStorage.clear();
    }
  },

  getMe: () => apiClient('/auth/me'),

  forgotPassword: (email: string) =>
    apiClient('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),

  resetPassword: (token: string, password: string) =>
    apiClient('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),

  verifyEmail: (token: string) =>
    apiClient(`/auth/verify-email?token=${token}`),
};

// ============================================================================
// ORGANIZATIONS API
// ============================================================================
export const orgsApi = {
  create: (data: {
    name: string;
    legalName?: string;
    industry?: string;
    currency?: string;
    businessType?: string;
    companySize?: string;
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    fiscalSettings?: any;
    taxConfig?: any;
  }) => apiClient('/orgs', { method: 'POST', body: JSON.stringify(data) }),

  get: (orgId: string) => apiClient(`/orgs/${orgId}`),

  update: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  getMembers: (orgId: string) => apiClient(`/orgs/${orgId}/members`),

  inviteMember: (orgId: string, data: { email: string; role?: string; departmentId?: string; managerId?: string }) =>
    apiClient(`/orgs/${orgId}/invite`, { method: 'POST', body: JSON.stringify(data) }),

  acceptInvite: (token: string) =>
    apiClient('/orgs/invites/accept', { method: 'POST', body: JSON.stringify({ token }) }),

  updateMemberRole: (orgId: string, userId: string, role: string) =>
    apiClient(`/orgs/${orgId}/members/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),

  updateMemberStatus: (orgId: string, userId: string, status: string) =>
    apiClient(`/orgs/${orgId}/members/${userId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  removeMember: (orgId: string, userId: string) =>
    apiClient(`/orgs/${orgId}/members/${userId}`, { method: 'DELETE' }),
};

// ============================================================================
// USERS API
// ============================================================================
export const usersApi = {
  list: (params?: any) => apiClient('/users', { params }),
  getMe: () => apiClient('/users/me'),
  get: (id: string) => apiClient(`/users/${id}`),
  update: (id: string, data: any) =>
    apiClient(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

// ============================================================================
// CONTACTS API
// ============================================================================
export const contactsApi = {
  list: (params?: any, orgId?: string) => {
    const activeOrgId = orgId || authStorage.getOrgId() || 'default';
    return apiClient(`/orgs/${activeOrgId}/contacts`, { params, orgId: activeOrgId });
  },

  get: (id: string, orgId?: string) => {
    const activeOrgId = orgId || authStorage.getOrgId() || 'default';
    return apiClient(`/orgs/${activeOrgId}/contacts/${id}`, { orgId: activeOrgId });
  },

  create: (data: any, orgId?: string) => {
    const activeOrgId = orgId || authStorage.getOrgId() || 'default';
    return apiClient(`/orgs/${activeOrgId}/contacts`, { method: 'POST', body: JSON.stringify(data), orgId: activeOrgId });
  },

  update: (id: string, data: any, orgId?: string) => {
    const activeOrgId = orgId || authStorage.getOrgId() || 'default';
    return apiClient(`/orgs/${activeOrgId}/contacts/${id}`, { method: 'PATCH', body: JSON.stringify(data), orgId: activeOrgId });
  },

  delete: (id: string, orgId?: string) => {
    const activeOrgId = orgId || authStorage.getOrgId() || 'default';
    return apiClient(`/orgs/${activeOrgId}/contacts/${id}`, { method: 'DELETE', orgId: activeOrgId });
  },
};

// ============================================================================
// COMPANIES API (B2B Business Entities)
// ============================================================================
export const companiesApi = {
  list: (params?: any, orgId?: string) => {
    const activeOrgId = orgId || authStorage.getOrgId() || 'default';
    return apiClient(`/orgs/${activeOrgId}/companies`, { params, orgId: activeOrgId });
  },

  getTree: (orgId?: string) => {
    const activeOrgId = orgId || authStorage.getOrgId() || 'default';
    return apiClient(`/orgs/${activeOrgId}/companies/tree`, { orgId: activeOrgId });
  },

  get: (id: string, orgId?: string) => {
    const activeOrgId = orgId || authStorage.getOrgId() || 'default';
    return apiClient(`/orgs/${activeOrgId}/companies/${id}`, { orgId: activeOrgId });
  },

  create: (data: any, orgId?: string) => {
    const activeOrgId = orgId || authStorage.getOrgId() || 'default';
    return apiClient(`/orgs/${activeOrgId}/companies`, { method: 'POST', body: JSON.stringify(data), orgId: activeOrgId });
  },

  update: (id: string, data: any, orgId?: string) => {
    const activeOrgId = orgId || authStorage.getOrgId() || 'default';
    return apiClient(`/orgs/${activeOrgId}/companies/${id}`, { method: 'PATCH', body: JSON.stringify(data), orgId: activeOrgId });
  },

  delete: (id: string, orgId?: string) => {
    const activeOrgId = orgId || authStorage.getOrgId() || 'default';
    return apiClient(`/orgs/${activeOrgId}/companies/${id}`, { method: 'DELETE', orgId: activeOrgId });
  },
};

// ============================================================================
// ADDRESSES API
// ============================================================================
export const addressesApi = {
  list: (params?: any, orgId?: string) =>
    apiClient('/addresses', { params, orgId }),

  get: (id: string, orgId?: string) =>
    apiClient(`/addresses/${id}`, { orgId }),

  create: (data: any, orgId?: string) =>
    apiClient('/addresses', { method: 'POST', body: JSON.stringify(data), orgId }),

  update: (id: string, data: any, orgId?: string) =>
    apiClient(`/addresses/${id}`, { method: 'PATCH', body: JSON.stringify(data), orgId }),

  delete: (id: string, orgId?: string) =>
    apiClient(`/addresses/${id}`, { method: 'DELETE', orgId }),
};

// ============================================================================
// TAGS API
// ============================================================================
export const tagsApi = {
  list: (params?: any, orgId?: string) =>
    apiClient('/tags', { params, orgId }),

  create: (data: any, orgId?: string) =>
    apiClient('/tags', { method: 'POST', body: JSON.stringify(data), orgId }),

  delete: (id: string, orgId?: string) =>
    apiClient(`/tags/${id}`, { method: 'DELETE', orgId }),

  attach: (data: { tagId: string; entityType: string; entityId: string }, orgId?: string) =>
    apiClient('/tags/attach', { method: 'POST', body: JSON.stringify(data), orgId }),

  detach: (tagId: string, entityType: string, entityId: string, orgId?: string) =>
    apiClient(`/tags/detach/${tagId}`, {
      method: 'DELETE',
      params: { entityType, entityId },
      orgId,
    }),

  getEntityTags: (entityType: string, entityId: string, orgId?: string) =>
    apiClient('/tags/entity', { params: { entityType, entityId }, orgId }),
};

// ============================================================================
// CUSTOM FIELDS API
// ============================================================================
export const customFieldsApi = {
  getDefinitions: (entityType?: string, orgId?: string) =>
    apiClient('/custom-fields/definitions', { params: { entityType }, orgId }),

  createDefinition: (data: any, orgId?: string) =>
    apiClient('/custom-fields/definitions', { method: 'POST', body: JSON.stringify(data), orgId }),

  updateDefinition: (id: string, data: any, orgId?: string) =>
    apiClient(`/custom-fields/definitions/${id}`, { method: 'PATCH', body: JSON.stringify(data), orgId }),

  deleteDefinition: (id: string, orgId?: string) =>
    apiClient(`/custom-fields/definitions/${id}`, { method: 'DELETE', orgId }),

  setValue: (data: any, orgId?: string) =>
    apiClient('/custom-fields/values', { method: 'POST', body: JSON.stringify(data), orgId }),

  getEntityValues: (entityType: string, entityId: string, orgId?: string) =>
    apiClient('/custom-fields/values', { params: { entityType, entityId }, orgId }),
};

// ============================================================================
// COMMENTS API
// ============================================================================
export const commentsApi = {
  list: (entityType: string, entityId: string, orgId?: string) =>
    apiClient('/comments', { params: { entityType, entityId }, orgId }),

  create: (data: { entityType: string; entityId: string; content: string; mentions?: string[]; metadata?: any }, orgId?: string) =>
    apiClient('/comments', { method: 'POST', body: JSON.stringify(data), orgId }),

  update: (id: string, data: { content: string; mentions?: string[]; metadata?: any }, orgId?: string) =>
    apiClient(`/comments/${id}`, { method: 'PATCH', body: JSON.stringify(data), orgId }),

  delete: (id: string, orgId?: string) =>
    apiClient(`/comments/${id}`, { method: 'DELETE', orgId }),
};

// ============================================================================
// ATTACHMENTS API
// ============================================================================
export const attachmentsApi = {
  list: (entityType: string, entityId: string, orgId?: string) =>
    apiClient('/attachments', { params: { entityType, entityId }, orgId }),

  get: (id: string, orgId?: string) =>
    apiClient(`/attachments/${id}`, { orgId }),

  create: (data: any, orgId?: string) =>
    apiClient('/attachments', { method: 'POST', body: JSON.stringify(data), orgId }),

  delete: (id: string, orgId?: string) =>
    apiClient(`/attachments/${id}`, { method: 'DELETE', orgId }),
};

// ============================================================================
// DEPARTMENTS API
// ============================================================================
export const departmentsApi = {
  list: (orgId?: string) =>
    apiClient('/departments', { orgId }),

  getTree: (orgId?: string) =>
    apiClient('/departments/tree', { orgId }),

  get: (id: string, orgId?: string) =>
    apiClient(`/departments/${id}`, { orgId }),

  create: (data: any, orgId?: string) =>
    apiClient('/departments', { method: 'POST', body: JSON.stringify(data), orgId }),

  update: (id: string, data: any, orgId?: string) =>
    apiClient(`/departments/${id}`, { method: 'PATCH', body: JSON.stringify(data), orgId }),

  delete: (id: string, orgId?: string) =>
    apiClient(`/departments/${id}`, { method: 'DELETE', orgId }),
};

// ============================================================================
// TEAMS API
// ============================================================================
export const teamsApi = {
  list: (departmentId?: string, orgId?: string) =>
    apiClient('/teams', { params: { departmentId }, orgId }),

  get: (id: string, orgId?: string) =>
    apiClient(`/teams/${id}`, { orgId }),

  create: (data: any, orgId?: string) =>
    apiClient('/teams', { method: 'POST', body: JSON.stringify(data), orgId }),

  update: (id: string, data: any, orgId?: string) =>
    apiClient(`/teams/${id}`, { method: 'PATCH', body: JSON.stringify(data), orgId }),

  delete: (id: string, orgId?: string) =>
    apiClient(`/teams/${id}`, { method: 'DELETE', orgId }),

  addMember: (teamId: string, data: { userId?: string; employeeId?: string; role?: string }, orgId?: string) =>
    apiClient(`/teams/${teamId}/members`, { method: 'POST', body: JSON.stringify(data), orgId }),

  removeMember: (teamId: string, memberId: string, orgId?: string) =>
    apiClient(`/teams/${teamId}/members/${memberId}`, { method: 'DELETE', orgId }),
};

// ============================================================================
// EMPLOYEES API (Core Platform)
// ============================================================================
export const employeesApi = {
  list: (params?: any, orgId?: string) =>
    apiClient('/employees', { params, orgId }),

  get: (id: string, orgId?: string) =>
    apiClient(`/employees/${id}`, { orgId }),

  create: (data: any, orgId?: string) =>
    apiClient('/employees', { method: 'POST', body: JSON.stringify(data), orgId }),

  update: (id: string, data: any, orgId?: string) =>
    apiClient(`/employees/${id}`, { method: 'PATCH', body: JSON.stringify(data), orgId }),

  delete: (id: string, orgId?: string) =>
    apiClient(`/employees/${id}`, { method: 'DELETE', orgId }),
};

// ============================================================================
// COMMUNICATIONS & EMAIL API
// ============================================================================
export const communicationsApi = {
  sendEmail: (data: {
    to: string;
    subject: string;
    text?: string;
    html?: string;
    from?: string;
    replyTo?: string;
    cc?: string[];
    bcc?: string[];
  }, orgId?: string) =>
    apiClient('/communications/email/send', { method: 'POST', body: JSON.stringify(data), orgId }),
};

// ============================================================================
// SEARCH API
// ============================================================================
export interface SearchResultItem {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  status?: string;
  url: string;
}

export const searchApi = {
  globalSearch: (query: string, limit = 5, orgId?: string) =>
    apiClient<SearchResultItem[]>('/search', { params: { q: query, limit }, orgId }),
};

// ============================================================================
// ACTIVITIES API
// ============================================================================
export const activitiesApi = {
  list: (orgIdOrParams?: string | any, params?: any) => {
    if (typeof orgIdOrParams === 'string') {
      return apiClient('/activities', { params, orgId: orgIdOrParams });
    }
    return apiClient('/activities', { params: orgIdOrParams });
  },

  get: (id: string, orgId?: string) =>
    apiClient(`/activities/${id}`, { orgId }),

  create: (orgIdOrData: string | any, data?: any) => {
    if (typeof orgIdOrData === 'string') {
      return apiClient('/activities', { method: 'POST', body: JSON.stringify(data), orgId: orgIdOrData });
    }
    return apiClient('/activities', { method: 'POST', body: JSON.stringify(orgIdOrData) });
  },

  update: (id: string, data: any, orgId?: string) =>
    apiClient(`/activities/${id}`, { method: 'PATCH', body: JSON.stringify(data), orgId }),

  delete: (id: string, orgId?: string) =>
    apiClient(`/activities/${id}`, { method: 'DELETE', orgId }),
};

// ============================================================================
// NOTIFICATIONS API
// ============================================================================
export const notificationsApi = {
  list: (orgIdOrParams?: string | any, params?: any) => {
    if (typeof orgIdOrParams === 'string') {
      return apiClient('/notifications', { params, orgId: orgIdOrParams });
    }
    return apiClient('/notifications', { params: orgIdOrParams });
  },

  getUnreadCount: (orgId?: string) =>
    apiClient('/notifications/unread-count', { orgId }),

  markRead: (id: string, orgId?: string) =>
    apiClient(`/notifications/${id}/read`, { method: 'PATCH', orgId }),

  markAllRead: (orgId?: string) =>
    apiClient('/notifications/mark-all-read', { method: 'POST', orgId }),

  delete: (id: string, orgId?: string) =>
    apiClient(`/notifications/${id}`, { method: 'DELETE', orgId }),
};

// ============================================================================
// AUDIT LOGS API
// ============================================================================
export const auditLogsApi = {
  list: (orgIdOrParams?: string | any, params?: any) => {
    if (typeof orgIdOrParams === 'string') {
      return apiClient('/audit-logs', { params, orgId: orgIdOrParams });
    }
    return apiClient('/audit-logs', { params: orgIdOrParams });
  },
};

// ============================================================================
// CUSTOMERS API (Customer 360)
// ============================================================================
export const customersApi = {
  list: (orgId: string, params?: any) =>
    apiClient(`/orgs/${orgId}/customers`, { params }),

  getStats: (orgId: string) =>
    apiClient(`/orgs/${orgId}/customers/stats`),

  getCustomer360: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/customers/${id}/360`),

  get: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/customers/${id}`),

  create: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}/customers`, { method: 'POST', body: JSON.stringify(data) }),

  update: (orgId: string, id: string, data: any) =>
    apiClient(`/orgs/${orgId}/customers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/customers/${id}`, { method: 'DELETE' }),
};

// ============================================================================
// LEADS API
// ============================================================================
export const leadsApi = {
  list: (orgId: string, params?: any) =>
    apiClient(`/orgs/${orgId}/leads`, { params }),

  getPipeline: (orgId: string) =>
    apiClient(`/orgs/${orgId}/leads/pipeline`),

  get: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/leads/${id}`),

  create: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}/leads`, { method: 'POST', body: JSON.stringify(data) }),

  update: (orgId: string, id: string, data: any) =>
    apiClient(`/orgs/${orgId}/leads/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  recalculateScore: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/leads/${id}/score/recalculate`, { method: 'POST' }),

  qualify: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/leads/${id}/qualify`, { method: 'POST' }),

  disqualify: (orgId: string, id: string, reason?: string) =>
    apiClient(`/orgs/${orgId}/leads/${id}/disqualify`, { method: 'POST', body: JSON.stringify({ reason }) }),

  convert: (orgId: string, id: string, data: any = {}) =>
    apiClient(`/orgs/${orgId}/leads/${id}/convert`, { method: 'POST', body: JSON.stringify(data) }),

  assign: (orgId: string, id: string, data: { strategy: string; targetUserId?: string | undefined; salesTeamId?: string | undefined }) =>
    apiClient(`/orgs/${orgId}/leads/${id}/assign`, { method: 'POST', body: JSON.stringify(data) }),

  checkDuplicates: (orgId: string, data: { email?: string | undefined; phone?: string | undefined; company?: string | undefined }) =>
    apiClient(`/orgs/${orgId}/leads/duplicates/check`, { method: 'POST', body: JSON.stringify(data) }),

  bulkAction: (orgId: string, data: { leadIds: string[]; action: string; payload?: any }) =>
    apiClient(`/orgs/${orgId}/leads/bulk`, { method: 'POST', body: JSON.stringify(data) }),

  importCsv: (orgId: string, rows: any[], dryRun = false) =>
    apiClient(`/orgs/${orgId}/leads/import${dryRun ? '?dryRun=true' : ''}`, { method: 'POST', body: JSON.stringify({ rows }) }),

  delete: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/leads/${id}`, { method: 'DELETE' }),
};

// ============================================================================
// PIPELINES API
// ============================================================================
export const pipelinesApi = {
  list: (orgId: string) =>
    apiClient(`/orgs/${orgId}/pipelines`),

  get: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/pipelines/${id}`),

  create: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}/pipelines`, { method: 'POST', body: JSON.stringify(data) }),

  update: (orgId: string, id: string, data: any) =>
    apiClient(`/orgs/${orgId}/pipelines/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/pipelines/${id}`, { method: 'DELETE' }),

  addStage: (orgId: string, pipelineId: string, data: any) =>
    apiClient(`/orgs/${orgId}/pipelines/${pipelineId}/stages`, { method: 'POST', body: JSON.stringify(data) }),

  updateStage: (orgId: string, pipelineId: string, stageId: string, data: any) =>
    apiClient(`/orgs/${orgId}/pipelines/${pipelineId}/stages/${stageId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteStage: (orgId: string, pipelineId: string, stageId: string) =>
    apiClient(`/orgs/${orgId}/pipelines/${pipelineId}/stages/${stageId}`, { method: 'DELETE' }),
};

// ============================================================================
// DEALS / OPPORTUNITIES API
// ============================================================================
export const dealsApi = {
  list: (orgId: string, params?: any) =>
    apiClient(`/orgs/${orgId}/deals`, { params }),

  getPipeline: (orgId: string, pipelineId?: string) =>
    apiClient(`/orgs/${orgId}/deals/pipeline`, { params: { pipelineId } }),

  getStats: (orgId: string, params?: any) =>
    apiClient(`/orgs/${orgId}/deals/stats`, { params }),

  get: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/deals/${id}`),

  create: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}/deals`, { method: 'POST', body: JSON.stringify(data) }),

  update: (orgId: string, id: string, data: any) =>
    apiClient(`/orgs/${orgId}/deals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  moveStage: (orgId: string, id: string, data: { stageId: string; reason?: string | undefined; probability?: number | undefined }) =>
    apiClient(`/orgs/${orgId}/deals/${id}/stage`, { method: 'POST', body: JSON.stringify(data) }),

  markWon: (orgId: string, id: string, data: { reason?: string | undefined; finalRevenue?: number | undefined } = {}) =>
    apiClient(`/orgs/${orgId}/deals/${id}/win`, { method: 'POST', body: JSON.stringify(data) }),

  markLost: (orgId: string, id: string, data: { reason?: string | undefined; finalRevenue?: number | undefined } = {}) =>
    apiClient(`/orgs/${orgId}/deals/${id}/lost`, { method: 'POST', body: JSON.stringify(data) }),

  delete: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/deals/${id}`, { method: 'DELETE' }),
};

// ============================================================================
// PRICELISTS API
// ============================================================================
export const pricelistsApi = {
  list: (orgId: string) =>
    apiClient(`/orgs/${orgId}/pricelists`),

  get: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/pricelists/${id}`),

  create: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}/pricelists`, { method: 'POST', body: JSON.stringify(data) }),

  update: (orgId: string, id: string, data: any) =>
    apiClient(`/orgs/${orgId}/pricelists/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  calculatePrice: (orgId: string, data: { productId: string; productVariantId?: string | undefined; pricelistId?: string | undefined; quantity?: number | undefined }) =>
    apiClient(`/orgs/${orgId}/pricelists/calculate`, { method: 'POST', body: JSON.stringify(data) }),

  calculate: (orgId: string, params: { productId: string; quantity: number; customerId?: string }) =>
    apiClient(`/orgs/${orgId}/pricelists/resolve`, { params }),

  addItem: (orgId: string, pricelistId: string, data: any) =>
    apiClient(`/orgs/${orgId}/pricelists/${pricelistId}/rules`, { method: 'POST', body: JSON.stringify(data) }),

  removeItem: (orgId: string, pricelistId: string, itemId: string) =>
    apiClient(`/orgs/${orgId}/pricelists/${pricelistId}/rules/${itemId}`, { method: 'DELETE' }),

  delete: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/pricelists/${id}`, { method: 'DELETE' }),
};

// ============================================================================
// QUOTATIONS API
// ============================================================================
export const quotationsApi = {
  list: (orgId: string, params?: any) =>
    apiClient(`/orgs/${orgId}/quotations`, { params }),

  get: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/quotations/${id}`),

  create: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}/quotations`, { method: 'POST', body: JSON.stringify(data) }),

  update: (orgId: string, id: string, data: any) =>
    apiClient(`/orgs/${orgId}/quotations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  sendEmail: (orgId: string, id: string, data: { to: string; subject?: string | undefined; message?: string | undefined; cc?: string[] | undefined }) =>
    apiClient(`/orgs/${orgId}/quotations/${id}/send`, { method: 'POST', body: JSON.stringify(data) }),

  accept: (orgId: string, id: string, data: { acceptedBy?: string | undefined; signatureData?: string | undefined; notes?: string | undefined } = {}) =>
    apiClient(`/orgs/${orgId}/quotations/${id}/accept`, { method: 'POST', body: JSON.stringify(data) }),

  reject: (orgId: string, id: string, reason: string) =>
    apiClient(`/orgs/${orgId}/quotations/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),

  cancel: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/quotations/${id}/cancel`, { method: 'POST' }),

  approve: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/quotations/${id}/approve`, { method: 'POST' }),

  approveDiscount: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/quotations/${id}/approve`, { method: 'POST' }),

  convertToSalesOrder: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/quotations/${id}/convert-to-order`, { method: 'POST' }),

  getPdfUrl: (orgId: string, id: string) =>
    `/api/orgs/${orgId}/quotations/${id}`,

  delete: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/quotations/${id}`, { method: 'DELETE' }),
};

// ============================================================================
// INVOICES API
// ============================================================================
export const invoicesApi = {
  list: (orgId: string, params?: any) =>
    apiClient(`/orgs/${orgId}/invoices`, { params }),

  get: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/invoices/${id}`),

  create: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}/invoices`, { method: 'POST', body: JSON.stringify(data) }),

  updateStatus: (orgId: string, id: string, status: string) =>
    apiClient(`/orgs/${orgId}/invoices/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  markPaid: (orgId: string, id: string, amount?: number | undefined, paymentMethod?: string | undefined) =>
    apiClient(`/orgs/${orgId}/invoices/${id}/pay`, { method: 'POST', body: JSON.stringify({ amount, paymentMethod }) }),

  delete: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/invoices/${id}`, { method: 'DELETE' }),

  getPdfUrl: (orgId: string, id: string) =>
    `/api/v1/orgs/${orgId}/invoices/${id}/pdf`,
};

// ============================================================================
// ORDERS API (Sales Orders)
// ============================================================================
export const ordersApi = {
  list: (orgId: string, params?: any) =>
    apiClient(`/orgs/${orgId}/orders`, { params }),

  get: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/orders/${id}`),

  getInvoiceContext: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/orders/${id}/invoice-context`),

  create: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}/orders`, { method: 'POST', body: JSON.stringify(data) }),

  update: (orgId: string, id: string, data: any) =>
    apiClient(`/orgs/${orgId}/orders/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  confirm: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/orders/${id}/confirm`, { method: 'POST' }),

  cancel: (orgId: string, id: string, reason: string) =>
    apiClient(`/orgs/${orgId}/orders/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),

  delete: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/orders/${id}`, { method: 'DELETE' }),
};

// ============================================================================
// PRODUCTS API
// ============================================================================
export const productsApi = {
  list: (orgId: string, params?: any) =>
    apiClient(`/orgs/${orgId}/products`, { params }),

  getCategories: (orgId: string) =>
    apiClient(`/orgs/${orgId}/products/categories`),

  createCategory: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}/products/categories`, { method: 'POST', body: JSON.stringify(data) }),

  get: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/products/${id}`),

  create: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}/products`, { method: 'POST', body: JSON.stringify(data) }),

  update: (orgId: string, id: string, data: any) =>
    apiClient(`/orgs/${orgId}/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  generateVariants: (orgId: string, id: string, data: { attributes: Array<{ name: string; values: string[] }> }) =>
    apiClient(`/orgs/${orgId}/products/${id}/variants/generate`, { method: 'POST', body: JSON.stringify(data) }),

  createVariant: (orgId: string, id: string, data: any) =>
    apiClient(`/orgs/${orgId}/products/${id}/variants`, { method: 'POST', body: JSON.stringify(data) }),

  adjustStock: (orgId: string, id: string, data: { quantity: number; type: string; notes?: string }) =>
    apiClient(`/orgs/${orgId}/products/${id}/stock-adjust`, { method: 'POST', body: JSON.stringify(data) }),

  delete: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/products/${id}`, { method: 'DELETE' }),
};

// ============================================================================
// TEMPLATES API
// ============================================================================
export const templatesApi = {
  list: (orgId: string, entityType?: string) =>
    apiClient(`/orgs/${orgId}/templates`, { params: { entityType } }),

  get: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/templates/${id}`),

  create: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}/templates`, { method: 'POST', body: JSON.stringify(data) }),

  update: (orgId: string, id: string, data: any) =>
    apiClient(`/orgs/${orgId}/templates/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/templates/${id}`, { method: 'DELETE' }),
};

// ============================================================================
// CRM ANALYTICS & FORECASTING API
// ============================================================================
export const crmAnalyticsApi = {
  getSummary: (orgId: string) =>
    apiClient(`/orgs/${orgId}/crm-analytics/summary`),

  getForecast: (orgId: string, pipelineId?: string) =>
    apiClient(`/orgs/${orgId}/crm-analytics/forecast`, { params: { pipelineId } }),
};

// ============================================================================
// ANALYTICS API
// ============================================================================
export const analyticsApi = {
  getDashboard: (orgId: string, period = '30d') =>
    apiClient(`/orgs/${orgId}/analytics/dashboard`, { params: { period } }),

  getRevenueTrend: (orgId: string, months = 6) =>
    apiClient(`/orgs/${orgId}/analytics/revenue-trend`, { params: { months } }),

  getCustomerGrowth: (orgId: string, months = 6) =>
    apiClient(`/orgs/${orgId}/analytics/customer-growth`, { params: { months } }),

  getPipeline: (orgId: string) =>
    apiClient(`/orgs/${orgId}/analytics/pipeline`),

  getTopProducts: (orgId: string, limit = 10) =>
    apiClient(`/orgs/${orgId}/analytics/top-products`, { params: { limit } }),

  getAIInsights: (orgId: string) =>
    apiClient(`/orgs/${orgId}/analytics/ai-insights`),
};

// ============================================================================
// AI API
// ============================================================================
export const aiApi = {
  listConversations: (orgId: string) =>
    apiClient(`/orgs/${orgId}/ai/conversations`),

  createConversation: (orgId: string, title?: string) =>
    apiClient(`/orgs/${orgId}/ai/conversations`, { method: 'POST', body: JSON.stringify({ title }) }),

  getConversation: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/ai/conversations/${id}`),

  renameConversation: (orgId: string, id: string, title: string) =>
    apiClient(`/orgs/${orgId}/ai/conversations/${id}`, { method: 'PATCH', body: JSON.stringify({ title }) }),

  deleteConversation: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/ai/conversations/${id}`, { method: 'DELETE' }),

  chat: (orgId: string, id: string, message: string) =>
    apiClient(`/orgs/${orgId}/ai/conversations/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
};

// ============================================================================
// AUTOMATIONS API
// ============================================================================
export const automationsApi = {
  list: (orgId: string, params?: any) =>
    apiClient(`/orgs/${orgId}/automations`, { params }),

  get: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/automations/${id}`),

  getExecutions: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/automations/${id}/executions`),

  create: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}/automations`, { method: 'POST', body: JSON.stringify(data) }),

  update: (orgId: string, id: string, data: any) =>
    apiClient(`/orgs/${orgId}/automations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  pause: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/automations/${id}/pause`, { method: 'POST' }),

  resume: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/automations/${id}/resume`, { method: 'POST' }),

  execute: (orgId: string, id: string, data?: any) =>
    apiClient(`/orgs/${orgId}/automations/${id}/run`, { method: 'POST', body: JSON.stringify(data || {}) }),

  delete: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/automations/${id}`, { method: 'DELETE' }),
};

// ============================================================================
// PAYMENTS API
// ============================================================================
export const paymentsApi = {
  recordPayment: (orgId: string, data: { invoiceId: string; amount: number; method?: string; notes?: string }) =>
    apiClient(`/orgs/${orgId}/payments/record`, { method: 'POST', body: JSON.stringify(data) }),
  list: (orgId: string) => apiClient(`/orgs/${orgId}/payments`),
};

// ============================================================================
// INTEGRATIONS API
// ============================================================================
export const integrationsApi = {
  list: (orgId: string) => apiClient(`/orgs/${orgId}/integrations`),

  connect: (orgId: string, type: string, config: any) =>
    apiClient(`/orgs/${orgId}/integrations/${type}/connect`, { method: 'POST', body: JSON.stringify(config) }),

  disconnect: (orgId: string, type: string) =>
    apiClient(`/orgs/${orgId}/integrations/${type}/disconnect`, { method: 'POST' }),
};

// ============================================================================
// CAMPAIGNS API
// ============================================================================
export const campaignsApi = {
  list: (orgId: string, params?: any) =>
    apiClient(`/orgs/${orgId}/campaigns`, { params }),

  get: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/campaigns/${id}`),

  create: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}/campaigns`, { method: 'POST', body: JSON.stringify(data) }),

  update: (orgId: string, id: string, data: any) =>
    apiClient(`/orgs/${orgId}/campaigns/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  launch: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/campaigns/${id}/launch`, { method: 'POST' }),

  delete: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/campaigns/${id}`, { method: 'DELETE' }),
};

// ============================================================================
// ACCOUNTING & FINANCE API
// ============================================================================
export const accountingApi = {
  getAccounts: (orgId: string) =>
    apiClient(`/orgs/${orgId}/accounting/accounts`),

  seedAccounts: (orgId: string) =>
    apiClient(`/orgs/${orgId}/accounting/accounts/seed`, { method: 'POST' }),

  getAccount: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/accounting/accounts/${id}`),

  createAccount: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}/accounting/accounts`, { method: 'POST', body: JSON.stringify(data) }),

  updateAccount: (orgId: string, id: string, data: any) =>
    apiClient(`/orgs/${orgId}/accounting/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  getJournalEntries: (orgId: string, params?: any) =>
    apiClient(`/orgs/${orgId}/accounting/journal-entries`, { params }),

  getJournalEntry: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/accounting/journal-entries/${id}`),

  createJournalEntry: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}/accounting/journal-entries`, { method: 'POST', body: JSON.stringify(data) }),

  getReports: (orgId: string) =>
    apiClient(`/orgs/${orgId}/accounting/reports`),

  getExpenses: (orgId: string, params?: any) =>
    apiClient(`/orgs/${orgId}/accounting/expenses`, { params }),

  createExpense: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}/accounting/expenses`, { method: 'POST', body: JSON.stringify(data) }),

  getTaxes: (orgId: string) =>
    apiClient(`/orgs/${orgId}/accounting/taxes`),

  createTax: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}/accounting/taxes`, { method: 'POST', body: JSON.stringify(data) }),

  getBankAccounts: (orgId: string) =>
    apiClient(`/orgs/${orgId}/accounting/bank-accounts`),

  createBankAccount: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}/accounting/bank-accounts`, { method: 'POST', body: JSON.stringify(data) }),

  getBankFeeds: (orgId: string, bankAccountId?: string) =>
    apiClient(`/orgs/${orgId}/accounting/bank-feeds`, { params: { bankAccountId } }),

  importBankFeed: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}/accounting/bank-feeds/import`, { method: 'POST', body: JSON.stringify(data) }),

  getAssets: (orgId: string) =>
    apiClient(`/orgs/${orgId}/accounting/assets`),

  createAsset: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}/accounting/assets`, { method: 'POST', body: JSON.stringify(data) }),

  getBudgets: (orgId: string) =>
    apiClient(`/orgs/${orgId}/accounting/budgets`),

  createBudget: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}/accounting/budgets`, { method: 'POST', body: JSON.stringify(data) }),
};

// ============================================================================
// PURCHASE & VENDOR API
// ============================================================================
export const purchaseApi = {
  getVendors: (orgId: string, params?: any) =>
    apiClient(`/orgs/${orgId}/purchase/vendors`, { params }),

  getVendor: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/purchase/vendors/${id}`),

  createVendor: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}/purchase/vendors`, { method: 'POST', body: JSON.stringify(data) }),

  updateVendor: (orgId: string, id: string, data: any) =>
    apiClient(`/orgs/${orgId}/purchase/vendors/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  getPurchaseOrders: (orgId: string, params?: any) =>
    apiClient(`/orgs/${orgId}/purchase/orders`, { params }),

  getOrders: (orgId: string, params?: any) =>
    apiClient(`/orgs/${orgId}/purchase/orders`, { params }),

  getPurchaseOrder: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/purchase/orders/${id}`),

  createPurchaseOrder: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}/purchase/orders`, { method: 'POST', body: JSON.stringify(data) }),

  createOrder: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}/purchase/orders`, { method: 'POST', body: JSON.stringify(data) }),

  confirmOrder: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/purchase/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'CONFIRMED' }) }),

  receiveStock: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/purchase/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'RECEIVED' }) }),

  updatePurchaseOrderStatus: (orgId: string, id: string, status: string) =>
    apiClient(`/orgs/${orgId}/purchase/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  getVendorBills: (orgId: string, params?: any) =>
    apiClient(`/orgs/${orgId}/purchase/bills`, { params }),

  getBills: (orgId: string, params?: any) =>
    apiClient(`/orgs/${orgId}/purchase/bills`, { params }),

  createVendorBill: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}/purchase/bills`, { method: 'POST', body: JSON.stringify(data) }),

  createBill: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}/purchase/bills`, { method: 'POST', body: JSON.stringify(data) }),
};

// ============================================================================
// MANUFACTURING (MRP) API
// ============================================================================
export const manufacturingApi = {
  getBOMs: (orgId: string, params?: any) =>
    apiClient(`/orgs/${orgId}/manufacturing/bom`, { params }),

  getBOM: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/manufacturing/bom/${id}`),

  createBOM: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}/manufacturing/bom`, { method: 'POST', body: JSON.stringify(data) }),

  getProductionOrders: (orgId: string, params?: any) =>
    apiClient(`/orgs/${orgId}/manufacturing/production-orders`, { params }),

  getOrders: (orgId: string, params?: any) =>
    apiClient(`/orgs/${orgId}/manufacturing/production-orders`, { params }),

  createProductionOrder: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}/manufacturing/production-orders`, { method: 'POST', body: JSON.stringify(data) }),

  createOrder: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}/manufacturing/production-orders`, { method: 'POST', body: JSON.stringify(data) }),

  completeOrder: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/manufacturing/production-orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'COMPLETED' }) }),

  updateProductionOrderStatus: (orgId: string, id: string, status: string) =>
    apiClient(`/orgs/${orgId}/manufacturing/production-orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  getWorkCenters: (orgId: string) =>
    apiClient(`/orgs/${orgId}/manufacturing/work-centers`),

  createWorkCenter: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}/manufacturing/work-centers`, { method: 'POST', body: JSON.stringify(data) }),

  getEquipments: (orgId: string) =>
    apiClient(`/orgs/${orgId}/manufacturing/equipments`),

  createEquipment: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}/manufacturing/equipments`, { method: 'POST', body: JSON.stringify(data) }),

  getQualityChecks: (orgId: string) =>
    apiClient(`/orgs/${orgId}/manufacturing/quality-checks`),
};

// ============================================================================
// PROJECTS, TIMESHEETS & FIELD SERVICE API
// ============================================================================
export const projectsApi = {
  getProjects: (orgId: string, params?: any) =>
    apiClient(`/orgs/${orgId}/projects`, { params }),

  getProject: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/projects/${id}`),

  createProject: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}/projects`, { method: 'POST', body: JSON.stringify(data) }),

  updateProject: (orgId: string, id: string, data: any) =>
    apiClient(`/orgs/${orgId}/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  getTimesheets: (orgId: string, params?: any) =>
    apiClient(`/orgs/${orgId}/projects/timesheets/list`, { params }),

  logTimesheet: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}/projects/timesheets/log`, { method: 'POST', body: JSON.stringify(data) }),

  getFieldServiceOrders: (orgId: string, params?: any) =>
    apiClient(`/orgs/${orgId}/projects/field-service/orders`, { params }),

  createFieldServiceOrder: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}/projects/field-service/orders`, { method: 'POST', body: JSON.stringify(data) }),
};

// ============================================================================
// HELPDESK API
// ============================================================================
export const helpdeskApi = {
  getTickets: (orgId: string, params?: any) =>
    apiClient(`/orgs/${orgId}/helpdesk/tickets`, { params }),

  getTicket: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/helpdesk/tickets/${id}`),

  createTicket: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}/helpdesk/tickets`, { method: 'POST', body: JSON.stringify(data) }),

  updateTicket: (orgId: string, id: string, data: any) =>
    apiClient(`/orgs/${orgId}/helpdesk/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  resolveTicket: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/helpdesk/tickets/${id}/resolve`, { method: 'POST' }),
};

// ============================================================================
// HR & RECRUITMENT API
// ============================================================================
export const hrApi = {
  getEmployees: (orgId: string, params?: any) =>
    apiClient(`/orgs/${orgId}/hr/employees`, { params }),

  getEmployee: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/hr/employees/${id}`),

  createEmployee: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}/hr/employees`, { method: 'POST', body: JSON.stringify(data) }),

  updateEmployee: (orgId: string, id: string, data: any) =>
    apiClient(`/orgs/${orgId}/hr/employees/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  getTimeOffRequests: (orgId: string, params?: any) =>
    apiClient(`/orgs/${orgId}/hr/time-off`, { params }),

  createTimeOffRequest: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}/hr/time-off`, { method: 'POST', body: JSON.stringify(data) }),

  approveTimeOff: (orgId: string, id: string) =>
    apiClient(`/orgs/${orgId}/hr/time-off/${id}/approve`, { method: 'POST' }),

  getAttendance: (orgId: string, params?: any) =>
    apiClient(`/orgs/${orgId}/hr/attendance`, { params }),

  logAttendance: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}/hr/attendance`, { method: 'POST', body: JSON.stringify(data) }),

  getJobs: (orgId: string) =>
    apiClient(`/orgs/${orgId}/hr/jobs`),

  createJob: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}/hr/jobs`, { method: 'POST', body: JSON.stringify(data) }),

  getApplicants: (orgId: string, jobId?: string) =>
    apiClient(`/orgs/${orgId}/hr/applicants`, { params: { jobId } }),

  createApplicant: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}/hr/applicants`, { method: 'POST', body: JSON.stringify(data) }),

  updateApplicantStage: (orgId: string, id: string, stage: string, status?: string) =>
    apiClient(`/orgs/${orgId}/hr/applicants/${id}/stage`, { method: 'PATCH', body: JSON.stringify({ stage, status }) }),
};

// ============================================================================
// DISCUSS, DOCUMENTS & SIGNATURES API
// ============================================================================
export const discussApi = {
  getChannels: (orgId: string) =>
    apiClient(`/orgs/${orgId}/discuss/channels`),

  createChannel: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}/discuss/channels`, { method: 'POST', body: JSON.stringify(data) }),

  getChannelMessages: (orgId: string, channelId: string) =>
    apiClient(`/orgs/${orgId}/discuss/channels/${channelId}/messages`),

  postMessage: (orgId: string, channelId: string, data: any) =>
    apiClient(`/orgs/${orgId}/discuss/channels/${channelId}/messages`, { method: 'POST', body: JSON.stringify(data) }),

  getDocuments: (orgId: string, category?: string) =>
    apiClient(`/orgs/${orgId}/discuss/documents`, { params: { category } }),

  createDocument: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}/discuss/documents`, { method: 'POST', body: JSON.stringify(data) }),

  getSignatures: (orgId: string) =>
    apiClient(`/orgs/${orgId}/discuss/signatures`),

  createSignatureRequest: (orgId: string, data: any) =>
    apiClient(`/orgs/${orgId}/discuss/signatures`, { method: 'POST', body: JSON.stringify(data) }),

  signDocument: (orgId: string, id: string, auditHash?: string) =>
    apiClient(`/orgs/${orgId}/discuss/signatures/${id}/sign`, { method: 'POST', body: JSON.stringify({ auditHash }) }),
};

