import * as boxesService from "../services/boxesService.js";

const boxTypeSet = new Set(["cash", "master", "swish", "sagi", "other_elec", "bank"]);

export async function listBoxes(req, res) {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    const data = await boxesService.getBoxesForMonth({ month, year });
    return res.json({ data });
  } catch (e) {
    const status = e.statusCode || 500;
    return res.status(status).json({ message: e.message || "Failed to list boxes" });
  }
}

export async function updateOpening(req, res) {
  try {
    const boxType = req.params.type;
    if (!boxTypeSet.has(boxType)) return res.status(400).json({ message: "Invalid box type" });

    const month = Number(req.body.month ?? req.query.month);
    const year = Number(req.body.year ?? req.query.year);
    const openingBalance = Number(req.body.opening_balance ?? req.body.openingBalance);

    const id = await boxesService.setBoxOpeningBalance({
      boxType,
      month,
      year,
      openingBalance
    });

    return res.json({ data: { id } });
  } catch (e) {
    const status = e.statusCode || 500;
    return res.status(status).json({ message: e.message || "Failed to update opening balance" });
  }
}

export async function updateActual(req, res) {
  try {
    const boxType = req.params.type;
    if (!boxTypeSet.has(boxType)) return res.status(400).json({ message: "Invalid box type" });

    const month = Number(req.body.month ?? req.query.month);
    const year = Number(req.body.year ?? req.query.year);
    const actualBalance = Number(req.body.actual_balance ?? req.body.actualBalance);

    const id = await boxesService.setBoxActualBalance({
      boxType,
      month,
      year,
      actualBalance
    });

    return res.json({ data: { id } });
  } catch (e) {
    const status = e.statusCode || 500;
    return res.status(status).json({ message: e.message || "Failed to update actual balance" });
  }
}

