import * as salesService from "../services/salesService.js";

export async function createSale(req, res, next) {
  try {
    const enteredByUserId = req.user.id;
    const sale = await salesService.createSale({
      payload: req.body,
      enteredByUserId
    });
    return res.json({ data: sale });
  } catch (e) {
    const status = e.statusCode || 500;
    return res.status(status).json({
      message: e.message || "Failed to create sale",
      details: e.details
    });
  }
}

export async function updateSale(req, res, next) {
  try {
    const enteredByUserId = req.user.id;
    const sale = await salesService.updateSale(req.params.id, {
      payload: req.body,
      enteredByUserId
    });
    return res.json({ data: sale });
  } catch (e) {
    const status = e.statusCode || 500;
    return res.status(status).json({
      message: e.message || "Failed to update sale",
      details: e.details
    });
  }
}

export async function deleteSale(req, res, next) {
  try {
    const enteredByUserId = req.user?.id;
    const result = await salesService.deleteSale(req.params.id, enteredByUserId);
    return res.json({ data: result });
  } catch (e) {
    const status = e.statusCode || 500;
    return res.status(status).json({
      message: e.message || "Failed to delete sale",
      details: e.details
    });
  }
}

export async function getSale(req, res, next) {
  try {
    const employeeId = req.query.employee_id;
    const date = req.query.date; // YYYY-MM-DD
    const month = parseInt(req.query.month);
    const year = parseInt(req.query.year);

    let data;
    if (month && year) {
      data = await salesService.getSalesByMonth({ month, year });
    } else if (employeeId && date) {
      data = await salesService.getSaleByEmployeeAndDate({ employeeId, date });
    } else {
      data = [];
    }
    return res.json({ data });
  } catch (e) {
    const status = e.statusCode || 500;
    return res.status(status).json({ message: e.message || "Failed to fetch sales" });
  }
}

export async function getSalesDay(req, res, next) {
  try {
    const date = req.query.date;
    const data = await salesService.getSalesForDay({ date });
    return res.json({ data });
  } catch (e) {
    const status = e.statusCode || 500;
    return res.status(status).json({ message: e.message || "Failed to fetch sales day" });
  }
}

export async function getCashBreakdown(req, res, next) {
  try {
    const saleId = req.params.id;
    const data = await salesService.getCashBreakdownBySaleId(saleId);
    return res.json({ data });
  } catch (e) {
    const status = e.statusCode || 500;
    return res.status(status).json({ message: e.message || "Failed to fetch cash breakdown" });
  }
}

