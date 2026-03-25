import * as expensesService from "../services/expensesService.js";

export async function createExpense(req, res) {
  try {
    const expense = await expensesService.createExpense({
      payload: req.body,
      enteredByUserId: req.user.id
    });
    return res.json({ data: expense });
  } catch (e) {
    const status = e.statusCode || 500;
    return res.status(status).json({ message: e.message || "Failed to create expense", details: e.details });
  }
}

export async function listExpenses(req, res) {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    const category = req.query.category ? String(req.query.category) : undefined;
    const boxType = req.query.box ? String(req.query.box) : undefined;
    const data = await expensesService.listExpenses({ month, year, category, boxType });
    return res.json({ data });
  } catch (e) {
    const status = e.statusCode || 500;
    return res.status(status).json({ message: e.message || "Failed to list expenses" });
  }
}

export async function updateExpense(req, res) {
  try {
    const result = await expensesService.updateExpense(req.params.id, {
      payload: req.body,
      enteredByUserId: req.user.id
    });
    return res.json({ data: result });
  } catch (e) {
    const status = e.statusCode || 500;
    return res.status(status).json({ message: e.message || "Failed to update expense", details: e.details });
  }
}

export async function deleteExpense(req, res) {
  try {
    const result = await expensesService.deleteExpense(req.params.id, req.user?.id);
    return res.json({ data: result });
  } catch (e) {
    const status = e.statusCode || 500;
    return res.status(status).json({ message: e.message || "Failed to delete expense", details: e.details });
  }
}

