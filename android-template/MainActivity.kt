
package com.geminifm.commander

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.webkit.*
import android.net.Uri
import android.os.Build
import android.os.Environment
import java.io.File
import java.security.MessageDigest
import org.json.JSONArray
import org.json.JSONObject
import android.content.Context

class MainActivity : Activity() {
    private lateinit var webView: WebView
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        webView = WebView(this)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.allowFileAccess = true
        webView.settings.allowContentAccess = true
        webView.settings.allowFileAccessFromFileURLs = true
        webView.settings.allowUniversalAccessFromFileURLs = true
        webView.webChromeClient = WebChromeClient()
        webView.webViewClient = WebViewClient()
        webView.addJavascriptInterface(FileBridge(this), "FileBridge")
        setContentView(webView)
        webView.loadUrl("file:///android_asset/www/index.html")
    }
    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }
}

class FileBridge(private val context: Context) {
    @JavascriptInterface
    fun getFilesJson(): String {
        val arr = JSONArray()
        try {
            val dirs = listOf(
                Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS),
                Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DCIM),
                Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES)
            )
            dirs.forEach { dir ->
                if (dir.exists()) {
                    dir.listFiles()?.take(200)?.forEach { file ->
                        if (file.isFile) {
                            val obj = JSONObject()
                            obj.put("name", file.name)
                            obj.put("path", file.parent + "/")
                            obj.put("source", if(file.path.contains("Download")) "Chrome - Downloads" else "Camera")
                            obj.put("created", java.text.SimpleDateFormat("yyyy-MM-dd").format(java.util.Date(file.lastModified())))
                            obj.put("last_opened", "")
                            obj.put("opens", 0)
                            obj.put("size", file.length().toString())
                            obj.put("sizeBytes", file.length())
                            obj.put("type", file.extension.lowercase())
                            obj.put("hash", sha256First1MB(file).take(8))
                            arr.put(obj)
                        }
                    }
                }
            }
        } catch (e: Exception) {}
        return arr.toString()
    }
    @JavascriptInterface
    fun deleteFile(fullPath: String): Boolean {
        return try {
            val file = File(fullPath)
            val trashDir = File(Environment.getExternalStorageDirectory(), "Trash/GeminiCommander")
            trashDir.mkdirs()
            file.renameTo(File(trashDir, file.name + "_" + System.currentTimeMillis()))
        } catch (e: Exception) { false }
    }
    @JavascriptInterface
    fun renameFile(oldPath: String, newName: String): Boolean {
        return try { File(oldPath).renameTo(File(File(oldPath).parent, newName)) } catch (e: Exception) { false }
    }
    @JavascriptInterface
    fun createFolder(path: String): Boolean { return try { File(path).mkdirs() } catch (e: Exception) { false } }
    @JavascriptInterface
    fun requestAllFilesPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            val intent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION)
            intent.data = Uri.parse("package:${context.packageName}")
            context.startActivity(intent)
        }
    }
    private fun sha256First1MB(file: File): String {
        return try {
            val md = MessageDigest.getInstance("SHA-256")
            val bytes = file.inputStream().use { it.readBytes().take(1024*1024).toByteArray() }
            md.update(bytes)
            md.digest().joinToString("") { "%02x".format(it) }
        } catch (e: Exception) { "nohash" }
    }
}
