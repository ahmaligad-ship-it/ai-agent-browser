
package com.geminifm.commander
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.Settings
import android.webkit.*
import java.io.File
import java.security.MessageDigest
import org.json.JSONArray
import org.json.JSONObject

class MainActivity : Activity() {
    private lateinit var webView: WebView
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        webView = WebView(this)
        with(webView.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            allowFileAccessFromFileURLs = true
            allowUniversalAccessFromFileURLs = true
        }
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
            val roots = mutableListOf<File>()
            Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)?.let { roots.add(it) }
            Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DCIM)?.let { roots.add(it) }
            Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES)?.let { roots.add(it) }
            for (dir in roots) {
                if (!dir.exists()) continue
                val files = dir.listFiles()?.filter { it.isFile }?.sortedByDescending { it.lastModified() }?.take(300) ?: continue
                for (file in files) {
                    try {
                        val obj = JSONObject()
                        obj.put("name", file.name)
                        obj.put("path", file.parent + "/")
                        obj.put("source", when {
                            file.path.contains("Download", true) -> "Chrome - Downloads"
                            file.path.contains("WhatsApp", true) -> "WhatsApp"
                            file.path.contains("DCIM", true) -> "Camera"
                            file.path.contains("Screenshots", true) -> "System - Screenshots"
                            else -> "Unknown"
                        })
                        obj.put("created", java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(java.util.Date(file.lastModified())))
                        obj.put("last_opened", "")
                        obj.put("opens", 0)
                        obj.put("size", "${file.length()/1024/1024}MB")
                        obj.put("sizeBytes", file.length())
                        obj.put("type", file.extension.lowercase())
                        obj.put("hash", sha256First(file).take(8))
                        arr.put(obj)
                    } catch (e: Exception) { continue }
                }
            }
        } catch (e: Exception) {}
        return arr.toString()
    }
    @JavascriptInterface
    fun deleteFile(fullPath: String): Boolean {
        return try {
            val file = File(fullPath)
            if (!file.exists()) return false
            val trashDir = File(Environment.getExternalStorageDirectory(), "Trash/GeminiCommander")
            trashDir.mkdirs()
            file.renameTo(File(trashDir, "${System.currentTimeMillis()}_${file.name}"))
        } catch (e: Exception) { false }
    }
    @JavascriptInterface
    fun renameFile(oldPath: String, newName: String): Boolean {
        return try {
            val old = File(oldPath)
            if (!old.exists()) return false
            val newFile = File(old.parent, newName)
            if (newFile.exists()) return false
            old.renameTo(newFile)
        } catch (e: Exception) { false }
    }
    @JavascriptInterface
    fun createFolder(fullPath: String): Boolean {
        return try { File(fullPath).mkdirs() } catch (e: Exception) { false }
    }
    @JavascriptInterface
    fun requestAllFilesPermission(): Boolean {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                val intent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION).apply {
                    data = Uri.parse("package:${context.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
            }
            true
        } catch (e: Exception) { false }
    }
    private fun sha256First(file: File): String {
        return try {
            val md = MessageDigest.getInstance("SHA-256")
            file.inputStream().use { ins ->
                val buf = ByteArray(1024*1024)
                val read = ins.read(buf)
                if (read > 0) md.update(buf, 0, read)
            }
            md.digest().joinToString("") { "%02x".format(it) }
        } catch (e: Exception) { "nohash" }
    }
}
