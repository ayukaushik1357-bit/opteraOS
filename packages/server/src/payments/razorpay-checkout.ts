/**
 * razorpay-checkout.ts
 *
 * Client-side Razorpay Checkout JS loader.
 * Razorpay Key ID is received from the server — NEVER hard-coded here.
 * The Key SECRET never touches the client.
 */

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  handler: (response: RazorpayPaymentResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
}

export interface RazorpayPaymentResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface RazorpayInstance {
  open(): void;
  close(): void;
  on(event: string, callback: (...args: any[]) => void): void;
}

let scriptLoaded = false;
let scriptLoadPromise: Promise<void> | null = null;

/** Lazily loads the Razorpay Checkout JS from their CDN */
export function loadRazorpayScript(): Promise<void> {
  if (scriptLoaded) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Razorpay Checkout is only available in a browser context"));
      return;
    }
    if (window.Razorpay) {
      scriptLoaded = true;
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      scriptLoaded = true;
      resolve();
    };
    script.onerror = () => {
      scriptLoadPromise = null;
      reject(new Error("Failed to load Razorpay Checkout. Check your internet connection."));
    };
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

/** Opens the Razorpay Checkout modal and returns a Promise that resolves with the payment response */
export async function openRazorpayCheckout(options: RazorpayOptions): Promise<RazorpayPaymentResponse> {
  await loadRazorpayScript();

  return new Promise<RazorpayPaymentResponse>((resolve, reject) => {
    const rzp = new window.Razorpay({
      ...options,
      handler: (response) => {
        resolve(response);
      },
      modal: {
        ondismiss: () => {
          reject(new Error("Payment was cancelled by the user."));
        },
      },
    });
    rzp.open();
  });
}
