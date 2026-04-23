package com.realmatka.app

import android.app.DownloadManager
import android.content.Context
import android.net.Uri
import android.os.Environment
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class AppUpdateDownloadModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "AppUpdateDownload"

  @ReactMethod
  fun downloadApk(url: String, fileName: String, promise: Promise) {
    try {
      val safeFileName = fileName
        .replace(Regex("[^A-Za-z0-9._-]"), "_")
        .ifBlank { "realmatka.apk" }

      val request = DownloadManager.Request(Uri.parse(url))
        .setTitle("Real Matka update")
        .setDescription("Downloading latest APK")
        .setMimeType("application/vnd.android.package-archive")
        .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
        .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, safeFileName)
        .setAllowedOverMetered(true)
        .setAllowedOverRoaming(true)

      val manager = reactContext.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
      val downloadId = manager.enqueue(request)
      promise.resolve(downloadId.toDouble())
    } catch (error: Exception) {
      promise.reject("APP_UPDATE_DOWNLOAD_FAILED", error.message, error)
    }
  }
}
