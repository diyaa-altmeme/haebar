import * as employeesService from "../services/employeesService.js";

export async function listEmployees(req, res) {
  try {
    const data = await employeesService.listEmployees();
    return res.json({ data });
  } catch (e) {
    return res.status(e.statusCode || 500).json({ message: e.message || "Failed to list employees" });
  }
}

export async function createEmployee(req, res) {
  try {
    const data = await employeesService.createEmployee(req.body);
    return res.json({ data });
  } catch (e) {
    return res.status(e.statusCode || 500).json({ message: e.message || "Failed to create employee", details: e.details });
  }
}

export async function updateEmployee(req, res) {
  try {
    const data = await employeesService.updateEmployee(req.params.id, req.body);
    return res.json({ data });
  } catch (e) {
    return res.status(e.statusCode || 500).json({ message: e.message || "Failed to update employee", details: e.details });
  }
}

export async function employeeSales(req, res) {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    const data = await employeesService.employeeSales({ id: req.params.id, month, year });
    return res.json({ data });
  } catch (e) {
    return res.status(e.statusCode || 500).json({ message: e.message || "Failed to fetch employee sales" });
  }
}

