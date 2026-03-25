import * as settingsService from "../services/settingsService.js";

export async function listExpenseCategories(req, res) {
  try {
    const data = await settingsService.listExpenseCategories();
    return res.json({ data });
  } catch (e) {
    return res.status(e.statusCode || 500).json({ message: e.message || "Failed to list categories" });
  }
}

export async function createExpenseCategory(req, res) {
  try {
    const data = await settingsService.createExpenseCategory(req.body);
    return res.json({ data });
  } catch (e) {
    return res.status(e.statusCode || 500).json({ message: e.message || "Failed to create category", details: e.details });
  }
}

export async function updateExpenseCategory(req, res) {
  try {
    const data = await settingsService.updateExpenseCategory(req.params.id, req.body);
    return res.json({ data });
  } catch (e) {
    return res.status(e.statusCode || 500).json({ message: e.message || "Failed to update category", details: e.details });
  }
}

export async function getActiveMonth(req, res) {
  try {
    const data = await settingsService.getActiveMonth();
    return res.json({ data });
  } catch (e) {
    return res.status(e.statusCode || 500).json({ message: e.message || "Failed to get active month" });
  }
}

export async function setActiveMonth(req, res) {
  try {
    const data = await settingsService.setActiveMonth({
      month: Number(req.body.month),
      year: Number(req.body.year),
      createdBy: req.user.id
    });
    return res.json({ data });
  } catch (e) {
    return res.status(e.statusCode || 500).json({ message: e.message || "Failed to set active month" });
  }
}

