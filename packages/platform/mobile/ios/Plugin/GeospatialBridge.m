/**
 * GeospatialBridge Objective-C Plugin Definition
 *
 * Capacitor plugin registration for GeospatialBridge.
 */

#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(GeospatialBridge, "GeospatialBridge",
    CAP_PLUGIN_METHOD(initialize, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(startARSession, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(stopARSession, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(createGeospatialAnchor, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(resolveGeospatialAnchor, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(removeGeospatialAnchor, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getCapabilities, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(requestLocationPermission, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(checkLocationPermission, CAPPluginReturnPromise);
)
