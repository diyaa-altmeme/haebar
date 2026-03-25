import * as reportsService from "../services/reportsService.js";

export async function getDashboard(req, res) {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    const data = await reportsService.getDashboard({ month, year });
    return res.json({ data });
  } catch (e) {
    return res.status(e.statusCode || 500).json({ message: e.message || "Failed dashboard" });
  }
}

