import React, { useState, useEffect } from 'react';
import { SafeAreaView, Button, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { pick, types } from '@react-native-documents/picker';
import RNFS from 'react-native-fs'; // We still need this
import buildInfo from './build-info';

// Your fixed CSP recipes (these are perfect)
const cspDefault = `
  default-src 'self' data: blob: 'unsafe-inline' 'unsafe-eval';
  connect-src 'none';
`;
const cspNetworkAllowed = `
  default-src * data: blob: 'unsafe-inline' 'unsafe-eval';
`;



/**
 * Creates the tiny host HTML page with ROBUST LOGGING.
 * This version uses XMLHttpRequest instead of fetch(), as fetch()
 * blocks file:// access on Android regardless of webview props.
 */
const createHostHtml = (fileUri, networkAllowed) => {
  const policy = networkAllowed ? cspNetworkAllowed : cspDefault;

  // Use JSON.stringify to safely embed these in the JS
  const jsSafePolicy = JSON.stringify(policy.replace(/\s+/g, ' ').trim());
  const jsSafeFileUri = JSON.stringify(fileUri);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Loading...</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body, html { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; background-color: #fff; }
        h1 { margin: 10px; font-size: 1.2em; }
        #logs { margin: 10px; border: 1px solid #ccc; background-color: #f9f9f9; padding: 10px; }
        .log { font-family: monospace; font-size: 0.9em; border-bottom: 1px solid #eee; padding: 4px 2px; }
        .error { color: #D8000C; font-weight: bold; background-color: #FFD2D2; }
        pre { white-space: pre-wrap; word-wrap: break-word; }
      </style>
    </head>
    <body>
      <h1>Loading Content...</h1>
      <div id="logs"></div>
      
      <script>
        const logEl = document.getElementById('logs');
        function log(msg) { console.log(msg); logEl.innerHTML += '<div class="log">' + msg + '</div>'; }
        function error(msg, e) {
          console.error(msg, e);
          let errorMsg = e ? e.message : 'Unknown error';
          let stack = e ? e.stack : 'No stack trace';
          logEl.innerHTML += '<div class="log error">' + msg + 
                             '<br><pre>Message: ' + errorMsg + '</pre>' +
                             '<pre>Stack: ' + stack + '</pre></div>';
          document.body.style.backgroundColor = '#FFD2D2';
        }

        // --- Use XHR Loader, not fetch ---
        function loadContent(fileUri, cspPolicy) {
          try {
            log('Script started.');
            const cspTag = '<meta http-equiv="Content-Security-Policy" content="' + cspPolicy + '">';
            log('File URI: ' + fileUri);
            log('CSP: ' + cspPolicy);

            log('Creating XMLHttpRequest...');
            const xhr = new XMLHttpRequest();
            
            xhr.onload = function() {
              log('XHR request completed with status: ' + xhr.status);
              if (xhr.status === 200 || (xhr.status === 0 && xhr.responseText)) { // 0 can be success for file://
                const html = xhr.responseText;
                log('Got ' + (html ? html.length : 0) + ' bytes of HTML.');
                
                log('Calling document.open()...');
                document.open();
                log('Writing CSP tag...');
                document.write(cspTag);
                log('Writing HTML content...');
                document.write(html);
                log('Calling document.close()...');
                document.close();
              } else {
                throw new Error('XHR failed with status ' + xhr.status);
              }
            };

            xhr.onerror = function() {
              log('XHR request.onerror triggered.');
              throw new Error('XHR request failed (onerror).');
            };

            xhr.open('GET', fileUri);
            log('Sending XHR request...');
            xhr.send();

          } catch (e) {
            error('CRITICAL ERROR in loader script:', e);
          }
        }

        const policy = ${jsSafePolicy};
        const uri = ${jsSafeFileUri};
        loadContent(uri, policy);
        
      </script>
    </body>
    </html>
  `;
};


const App = () => {
  const [fileUri, setFileUri] = useState(null); // This will be the file:///... URI
  const [error, setError] = useState(null);
  const [isNetworkAllowed, setIsNetworkAllowed] = useState(false);
  const [hostHtml, setHostHtml] = useState(null);

  // When fileUri or policy changes, regenerate the host HTML
  useEffect(() => {
    if (fileUri) {
      setHostHtml(createHostHtml(fileUri, isNetworkAllowed));
    } else {
      setHostHtml(null);
    }
  }, [fileUri, isNetworkAllowed]);

  const loadHtmlFile = async (isTestFile = false) => {
    const isTest = isTestFile === true;
    console.log('--- loadHtmlFile started ---');
    setError(null);
    
    let sourceUri;
    let localFile;

    if (isTest) {
      const testModePath = RNFS.DownloadDirectoryPath + '/test.html';
      try {
        if (await RNFS.exists(testModePath)) {
          console.log('Loading test file...');
          sourceUri = 'file://' + testModePath;
          localFile = `${RNFS.CachesDirectoryPath}/test_file_processed.html`;
        } else { return; }
      } catch (e) { return; }
    } else {
      let pickResult;
      try {
        const [result] = await pick({ type: [types.allFiles] });
        pickResult = result;
      } catch (pickError) {
        if (pickError.code === 'DOCUMENT_PICKER_CANCELED') {
          setError('File selection was cancelled.');
        } else {
          setError('Failed during file pick step: ' + pickError.message);
        }
        return;
      }
      if (!pickResult || !pickResult.uri) { 
        setError('File picker returned an invalid result.');
        return; 
      }
      sourceUri = pickResult.uri;
      localFile = `${RNFS.CachesDirectoryPath}/${Date.now()}_picked_file.html`;
    }

    // 1. JUST COPY THE FILE. This is fast.
    try {
      console.log(`Attempting RNFS.copyFile from ${sourceUri} to ${localFile}`);
      await RNFS.copyFile(sourceUri, localFile);
      console.log('RNFS.copyFile successful.');
      
      // 2. SET THE URI. This triggers the useEffect to build the host HTML.
      setFileUri('file://' + localFile);
      console.log('--- loadHtmlFile successful! ---');

    } catch (copyError) {
      console.error('!!! ERROR in RNFS.copyFile step:', copyError);
      setError('Failed to copy file from picker: ' + copyError.message);
    }
  };

  // Auto-load test file on mount
  useEffect(() => {
    if (0 && !fileUri) { // Disabled as you had it
      loadHtmlFile(true);
    }
  }, []);

  const Checkbox = ({ label, value, onValueChange }) => (
    <TouchableOpacity onPress={() => onValueChange(!value)} style={styles.checkboxContainer}>
      <View style={[styles.checkbox, value && styles.checkboxChecked]}>
        {value && <Text style={styles.checkboxCheckmark}>✓</Text>}
      </View>
      <Text style={styles.checkboxLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {!hostHtml ? (
        <View style={styles.menu}>
          <Text style={styles.title}>My Static App Viewer</Text>
          <Checkbox
            label="Allow HTTP Networking"
            value={isNetworkAllowed}
            onValueChange={setIsNetworkAllowed}
          />
          <Button title="Load Local HTML File" onPress={loadHtmlFile} />
          {error && <Text style={styles.errorText}>{error}</Text>}
          <View style={styles.buildInfoContainer}>
            <Text style={styles.buildInfoText}>
              Build: {buildInfo.date} ({buildInfo.hash})
            </Text>
          </View>
        </View>
      ) : (
        <WebView
          originWhitelist={['*']}
          
          // Use the TINY host HTML string
          source={{ html: hostHtml, baseUrl: `file://${RNFS.CachesDirectoryPath}/` }}
          
          javaScriptEnabled={true}
          domStorageEnabled={true}
          
          // The critical props that make the in-page fetch() work
          allowFileAccess={true}
          allowFileAccessFromFileURLs={true}
          allowUniversalAccessFromFileURLs={true} // Needed for file:// to fetch
          
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <Text>Loading File...</Text>
            </View>
          )}
          startInLoadingState={true}
          
          onError={(syntheticEvent) => {
            const {nativeEvent} = syntheticEvent;
            console.error('!!! WebView error: ', nativeEvent);
            setError(`WebView Error: ${nativeEvent.description}`);
            setFileUri(null); // Go back to menu
          }}
        />
      )}
    </SafeAreaView>
  );
};

// ... (styles are unchanged)
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  menu: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkboxCheckmark: {
    color: 'white',
    fontSize: 14,
  },
  checkboxLabel: {
    fontSize: 16,
  },
  errorText: {
    marginTop: 10,
    color: 'red',
  },
  buildInfoContainer: {
    position: 'absolute',
    right: 10,
    bottom: 10,
  },
  buildInfoText: {
    fontSize: 10,
    color: 'grey',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default App;

