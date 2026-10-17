/** A very short vibration where supported (Android). iOS Safari ignores it. */
export function tapFeedback() {
  try {
    navigator.vibrate?.(8);
  } catch {
    // Some browsers throw when vibration is blocked; feedback is optional.
  }
}
