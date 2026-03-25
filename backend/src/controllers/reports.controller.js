import * as reportsService from "../services/reportsService.js";

export async function dailyReport(req, res) {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    const data = await reportsService.getDailyReport({ month, year });
    return res.json({ data });
  } catch (e) {
    return res.status(e.statusCode || 500).json({ message: e.message || "Failed daily report" });
  }
}

export async function weeklyReport(req, res) {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    const data = await reportsService.getWeeklyReport({ month, year });
    return res.json({ data });
  } catch (e) {
    return res.status(e.statusCode || 500).json({ message: e.message || "Failed weekly report" });
  }
}

export async function monthlyReport(req, res) {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    const data = await reportsService.getMonthlyReport({ month, year });
    return res.json({ data });
  } catch (e) {
    return res.status(e.statusCode || 500).json({ message: e.message || "Failed monthly report" });
  }
}

export async function employeeReport(req, res) {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    const employeeId = req.params.id;
    // Minimal employee report from sales table
    const all = await reportsService.getMonthlyReport({ month, year });
    const data = all.daily; // placeholder, detailed per-employee to be expanded
    return res.json({ employeeId, data });
  } catch (e) {
    return res.status(e.statusCode || 500).json({ message: e.message || "Failed employee report" });
  }
}

