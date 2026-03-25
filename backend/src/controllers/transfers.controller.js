import * as transfersService from "../services/transfersService.js";

export async function createTransfer(req, res) {
  try {
    const transfer = await transfersService.createTransfer({
      payload: req.body,
      authorizedByUserId: req.user?.id
    });
    return res.json({ data: transfer });
  } catch (e) {
    const status = e.statusCode || 500;
    return res.status(status).json({ message: e.message || "Failed to create transfer", details: e.details });
  }
}

export async function listTransfers(req, res) {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    const data = await transfersService.listTransfers({ month, year });
    return res.json({ data });
  } catch (e) {
    const status = e.statusCode || 500;
    return res.status(status).json({ message: e.message || "Failed to list transfers", details: e.details });
  }
}

export async function confirmTransfer(req, res) {
  try {
    const transfer = await transfersService.confirmTransfer(req.params.id, req.user?.id);
    return res.json({ data: transfer });
  } catch (e) {
    const status = e.statusCode || 500;
    return res.status(status).json({ message: e.message || "Failed to confirm transfer", details: e.details });
  }
}

