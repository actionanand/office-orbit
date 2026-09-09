import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const appPackage = readFileSync('capacitor.config.ts', 'utf8').match(/appId:\s*'([^']+)'/)?.[1];
if (!appPackage) throw new Error('Missing appId');

const javaDir = join('android', 'app', 'src', 'main', 'java', ...appPackage.split('.'));
const mainActivityPath = join(javaDir, 'MainActivity.java');
const pluginPath = join(javaDir, 'OfficeOrbitCredentialsPlugin.java');
const gradlePath = join('android', 'app', 'build.gradle');
const dependencies = [
  'implementation "androidx.credentials:credentials:1.6.0"',
  'implementation "androidx.credentials:credentials-play-services-auth:1.6.0"',
];

mkdirSync(javaDir, { recursive: true });
writeFileSync(
  pluginPath,
  `package ${appPackage};

import android.app.Activity;
import android.os.CancellationSignal;

import androidx.core.content.ContextCompat;
import androidx.credentials.CreateCredentialResponse;
import androidx.credentials.CreatePasswordRequest;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.GetPasswordOption;
import androidx.credentials.PasswordCredential;
import androidx.credentials.exceptions.CreateCredentialCancellationException;
import androidx.credentials.exceptions.CreateCredentialException;
import androidx.credentials.exceptions.CreateCredentialNoCreateOptionException;
import androidx.credentials.exceptions.CreateCredentialProviderConfigurationException;
import androidx.credentials.exceptions.CreateCredentialUnsupportedException;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.credentials.exceptions.GetCredentialProviderConfigurationException;
import androidx.credentials.exceptions.GetCredentialUnsupportedException;
import androidx.credentials.exceptions.NoCredentialException;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Collections;

@CapacitorPlugin(name = "OfficeOrbitCredentials")
public class OfficeOrbitCredentialsPlugin extends Plugin {
  @PluginMethod
  public void savePassword(PluginCall call) {
    String username = call.getString("username");
    String password = call.getString("password");
    Activity activity = getActivity();
    if (activity == null || username == null || username.trim().isEmpty() || password == null || password.isEmpty()) {
      resolveStatus(call, "unavailable");
      return;
    }

    CredentialManager manager = CredentialManager.create(getContext());
    CreatePasswordRequest request = new CreatePasswordRequest(username, password, null, false, false);
    manager.createCredentialAsync(
      activity,
      request,
      new CancellationSignal(),
      ContextCompat.getMainExecutor(getContext()),
      new CredentialManagerCallback<CreateCredentialResponse, CreateCredentialException>() {
        @Override
        public void onResult(CreateCredentialResponse result) {
          resolveStatus(call, "saved");
        }

        @Override
        public void onError(CreateCredentialException error) {
          if (error instanceof CreateCredentialCancellationException) {
            resolveStatus(call, "cancelled");
          } else if (
            error instanceof CreateCredentialProviderConfigurationException ||
            error instanceof CreateCredentialUnsupportedException ||
            error instanceof CreateCredentialNoCreateOptionException
          ) {
            resolveStatus(call, "unavailable");
          } else {
            resolveStatus(call, "error");
          }
        }
      }
    );
  }

  @PluginMethod
  public void getPassword(PluginCall call) {
    Activity activity = getActivity();
    if (activity == null) {
      resolveStatus(call, "unavailable");
      return;
    }

    CredentialManager manager = CredentialManager.create(getContext());
    GetPasswordOption passwordOption = new GetPasswordOption(Collections.emptySet(), false, Collections.emptySet());
    GetCredentialRequest request = new GetCredentialRequest.Builder()
      .addCredentialOption(passwordOption)
      .build();
    manager.getCredentialAsync(
      activity,
      request,
      new CancellationSignal(),
      ContextCompat.getMainExecutor(getContext()),
      new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
        @Override
        public void onResult(GetCredentialResponse result) {
          Credential credential = result.getCredential();
          if (!(credential instanceof PasswordCredential)) {
            resolveStatus(call, "error");
            return;
          }

          PasswordCredential passwordCredential = (PasswordCredential) credential;
          JSObject response = new JSObject();
          response.put("status", "success");
          response.put("username", passwordCredential.getId());
          response.put("password", passwordCredential.getPassword());
          call.resolve(response);
        }

        @Override
        public void onError(GetCredentialException error) {
          if (error instanceof GetCredentialCancellationException) {
            resolveStatus(call, "cancelled");
          } else if (error instanceof NoCredentialException) {
            resolveStatus(call, "not-found");
          } else if (
            error instanceof GetCredentialProviderConfigurationException ||
            error instanceof GetCredentialUnsupportedException
          ) {
            resolveStatus(call, "unavailable");
          } else {
            resolveStatus(call, "error");
          }
        }
      }
    );
  }

  private void resolveStatus(PluginCall call, String status) {
    JSObject result = new JSObject();
    result.put("status", status);
    call.resolve(result);
  }
}
`,
);

let mainActivity = readFileSync(mainActivityPath, 'utf8');
if (!/registerPlugin\(OfficeOrbitCredentialsPlugin\.class\)/.test(mainActivity)) {
  mainActivity = mainActivity.replace(
    /super\.onCreate\(savedInstanceState\);/,
    'registerPlugin(OfficeOrbitCredentialsPlugin.class);\n    super.onCreate(savedInstanceState);',
  );
  writeFileSync(mainActivityPath, mainActivity);
}

let gradle = readFileSync(gradlePath, 'utf8');
const missing = dependencies.filter(dependency => !gradle.includes(dependency));
if (missing.length > 0) {
  const dependencyLines = missing.map(dependency => `    ${dependency}`).join('\n');
  if (/dependencies\s*\{/.test(gradle)) {
    gradle = gradle.replace(/dependencies\s*\{/, match => `${match}\n${dependencyLines}`);
  } else {
    gradle = `${gradle.trimEnd()}\n\ndependencies {\n${dependencyLines}\n}\n`;
  }
  writeFileSync(gradlePath, gradle);
}

console.log('Android Credential Manager plugin patched for Office Orbit.');
