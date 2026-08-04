export const COMMISSION_STATUS_LABELS = {
    Pending: "Pending",
    Accepted: "Invoice Sent - Awaiting Payment",
    Paid: "Payment Received - Starting Soon!",
    Sketch: "Sketch - 0% to 25% Complete",
    Lineart: "Lineart - 25% to 50% Complete",
    Coloring: "Coloring - 50% to 75% Complete",
    Shading: "Shading - 75% to 100% Complete",
    Completed: "Completed!",
};

export const COMMISSION_STATUSES = [
    "Pending",
    "Accepted",
    "Paid",
    "Sketch",
    "Lineart",
    "Coloring",
    "Shading",
    "Completed",
];

export function formatCommissionStatus(status) {
    return COMMISSION_STATUS_LABELS[status] || status;
}
