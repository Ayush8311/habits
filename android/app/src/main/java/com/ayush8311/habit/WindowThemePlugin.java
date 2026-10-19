package com.ayush8311.habit;

import android.graphics.Color;
import android.view.View;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Paints the native window behind the web content in the app's current theme colour.
 * On WebView versions before 140, Capacitor pads the window for the status and gesture
 * bars, and those strips show this background; without it they stayed light in Dark.
 */
@CapacitorPlugin(name = "WindowTheme")
public class WindowThemePlugin extends Plugin {

    @PluginMethod
    public void setBackgroundColor(PluginCall call) {
        String value = call.getString("color");
        int color;
        try {
            color = Color.parseColor(value);
        } catch (IllegalArgumentException | NullPointerException error) {
            call.reject("Invalid color: " + value);
            return;
        }
        getActivity()
            .runOnUiThread(() -> {
                View decor = getActivity().getWindow().getDecorView();
                decor.setBackgroundColor(color);
                if (getBridge().getWebView() != null) getBridge().getWebView().setBackgroundColor(color);
                call.resolve();
            });
    }
}
