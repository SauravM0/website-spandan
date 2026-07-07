import { Response } from 'express';
import {
  getAppointmentRequestsFiltered,
  getAppointmentRequestById,
  getLeadNotes,
  getLeadStatusHistoryWithStaffName,
  updateAppointmentRequestStatusWithHistory,
} from '../models';
import { AuthenticatedRequest } from '../middleware/auth';
import { badRequest, notFound, forbidden, serverError } from '../utils/errors';

export async function listLeads(req: AuthenticatedRequest, res: Response): Promise<void> {
  const status = req.query.status as string | undefined;
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  let page = parseInt(req.query.page as string, 10) || 1;
  let pageSize = parseInt(req.query.page_size as string, 10) || 25;

  // Cap page_size at 100
  if (pageSize > 100) pageSize = 100;
  if (page < 1) page = 1;
  if (pageSize < 1) pageSize = 25;

  // Validate status if provided
  const validStatuses = ['new', 'contacted', 'scheduled', 'completed', 'closed_no_response'];
  if (status && !validStatuses.includes(status)) {
    badRequest(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    return;
  }

  try {
    const result = await getAppointmentRequestsFiltered({
      status,
      from,
      to,
      page,
      pageSize,
    });
    res.json(result);
  } catch (err) {
    console.error('Failed to fetch leads:', err);
    serverError(res);
  }
}

export async function getLeadById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const lead = await getAppointmentRequestById(req.params.id);
    if (!lead) {
      notFound(res, 'Lead not found');
      return;
    }
    const history = await getLeadStatusHistoryWithStaffName(req.params.id);
    const notes = await getLeadNotes(req.params.id);
    res.json({ lead, history, notes });
  } catch (err) {
    console.error('Failed to fetch lead:', err);
    serverError(res);
  }
}

export async function updateLeadStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { new_status, notes } = req.body;
  const staffId = req.user?.id;

  if (!new_status) {
    badRequest(res, 'new_status is required');
    return;
  }

  const validStatuses = ['new', 'contacted', 'scheduled', 'completed', 'closed_no_response'];
  if (!validStatuses.includes(new_status)) {
    badRequest(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    return;
  }

  try {
    const lead = await updateAppointmentRequestStatusWithHistory(
      req.params.id,
      new_status,
      staffId || null,
      typeof notes === 'string' ? notes.trim() : undefined
    );

    if (!lead) {
      // RLS would return no rows if not permitted - translate to 403
      forbidden(res, 'You do not have permission to update this lead');
      return;
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Failed to update lead status:', err);
    serverError(res);
  }
}
