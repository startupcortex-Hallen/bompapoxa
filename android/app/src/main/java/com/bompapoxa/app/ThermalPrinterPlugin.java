package com.bompapoxa.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.OutputStream;
import java.util.Set;
import java.util.UUID;

@CapacitorPlugin(
    name = "ThermalPrinter",
    permissions = {
        @Permission(
            alias = "bluetooth",
            strings = { Manifest.permission.BLUETOOTH_CONNECT, Manifest.permission.BLUETOOTH_SCAN }
        )
    }
)
public class ThermalPrinterPlugin extends Plugin {

    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    private BluetoothSocket socket;
    private OutputStream outputStream;
    private String connectedName;

    private BluetoothAdapter adapter() {
        return BluetoothAdapter.getDefaultAdapter();
    }

    private boolean permissoesConcedidas() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true;
        return getContext().checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED
            && getContext().checkSelfPermission(Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED;
    }

    @PluginMethod
    public void listDevices(PluginCall call) {
        BluetoothAdapter adapter = adapter();
        if (adapter == null) {
            call.reject("Bluetooth não suportado neste aparelho.");
            return;
        }
        if (!adapter.isEnabled()) {
            call.reject("Ative o Bluetooth do aparelho.");
            return;
        }
        if (!permissoesConcedidas()) {
            requestPermissionForAlias("bluetooth", call, "permissoesCallbackList");
            return;
        }
        listarPareados(call);
    }

    @PermissionCallback
    private void permissoesCallbackList(PluginCall call) {
        if (!permissoesConcedidas()) {
            call.reject("Permissão de Bluetooth negada.");
            return;
        }
        listarPareados(call);
    }

    @SuppressLint("MissingPermission")
    private void listarPareados(PluginCall call) {
        JSArray devices = new JSArray();
        Set<BluetoothDevice> pareados = adapter().getBondedDevices();
        for (BluetoothDevice device : pareados) {
            JSObject item = new JSObject();
            item.put("address", device.getAddress());
            String nome = device.getName();
            item.put("name", nome != null && !nome.isEmpty() ? nome : device.getAddress());
            devices.put(item);
        }
        JSObject ret = new JSObject();
        ret.put("devices", devices);
        call.resolve(ret);
    }

    @PluginMethod
    public void connect(PluginCall call) {
        String address = call.getString("address");
        if (address == null || address.isEmpty()) {
            call.reject("Endereço da impressora ausente.");
            return;
        }
        BluetoothAdapter adapter = adapter();
        if (adapter == null) {
            call.reject("Bluetooth não suportado neste aparelho.");
            return;
        }
        if (!adapter.isEnabled()) {
            call.reject("Ative o Bluetooth do aparelho.");
            return;
        }
        if (!permissoesConcedidas()) {
            requestPermissionForAlias("bluetooth", call, "permissoesCallbackConnect");
            return;
        }
        conectar(call, address);
    }

    @PermissionCallback
    private void permissoesCallbackConnect(PluginCall call) {
        if (!permissoesConcedidas()) {
            call.reject("Permissão de Bluetooth negada.");
            return;
        }
        conectar(call, call.getString("address"));
    }

    @SuppressLint("MissingPermission")
    private void conectar(final PluginCall call, final String address) {
        new Thread(() -> {
            try {
                BluetoothAdapter adapter = adapter();
                BluetoothDevice device = adapter.getRemoteDevice(address);
                if (adapter.isDiscovering()) adapter.cancelDiscovery();
                fecharConexao();
                socket = device.createRfcommSocketToServiceRecord(SPP_UUID);
                socket.connect();
                outputStream = socket.getOutputStream();
                connectedName = device.getName();
                JSObject ret = new JSObject();
                ret.put("name", connectedName != null && !connectedName.isEmpty() ? connectedName : address);
                call.resolve(ret);
            } catch (Exception erro) {
                fecharConexao();
                call.reject("Não foi possível conectar à impressora: " + erro.getMessage());
            }
        }).start();
    }

    @PluginMethod
    public void write(PluginCall call) {
        String data = call.getString("data");
        if (data == null) {
            call.reject("Dados de impressão ausentes.");
            return;
        }
        final OutputStream stream = outputStream;
        if (stream == null) {
            call.reject("Impressora não conectada.");
            return;
        }
        new Thread(() -> {
            try {
                byte[] bytes = Base64.decode(data, Base64.DEFAULT);
                stream.write(bytes);
                stream.flush();
                call.resolve();
            } catch (Exception erro) {
                call.reject("Falha ao enviar para a impressora: " + erro.getMessage());
            }
        }).start();
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        fecharConexao();
        call.resolve();
    }

    @PluginMethod
    public void isConnected(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("connected", socket != null && socket.isConnected() && outputStream != null);
        call.resolve(ret);
    }

    private void fecharConexao() {
        try {
            if (outputStream != null) outputStream.close();
        } catch (Exception ignored) {
        }
        try {
            if (socket != null) socket.close();
        } catch (Exception ignored) {
        }
        outputStream = null;
        socket = null;
        connectedName = null;
    }
}
