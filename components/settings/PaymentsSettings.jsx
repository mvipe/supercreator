"use client";
export default function PaymentsSettings() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold">Payment methods</h2>
        <p className="text-sm text-inkmuted">Manage your payment methods for courses and services</p>
      </div>

      <div className="rounded-lg border border-line p-6 text-center">
        <p className="text-sm text-inkmuted">No payment methods added yet</p>
        <button className="btn btn-ghost mt-4">Add payment method</button>
      </div>
    </div>
  );
}
