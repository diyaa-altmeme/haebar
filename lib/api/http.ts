export function ok(data: unknown, init?: ResponseInit) {
  return Response.json({ data }, init);
}

export function created(data: unknown) {
  return Response.json({ data }, { status: 201 });
}

export function handleApiError(error: unknown) {
  const message = error instanceof Error ? error.message : "حدث خطأ غير متوقع.";
  const status =
    typeof error === "object" && error !== null && "status" in error && typeof error.status === "number"
      ? error.status
      : 500;

  return Response.json(
    {
      error: message
    },
    { status }
  );
}
