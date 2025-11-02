import React, { useState, useEffect } from 'react';
import { SafeAreaView, Button, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { pick, types } from '@react-native-documents/picker';
import RNFS from 'react-native-fs'; // We still need this
import buildInfo from './build-info';

// CSP policies remain the same
const cspDefault = ` default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'none'; media-src 'none'; object-src 'none'; frame-src 'none'; `;
const cspNetworkAllowed = ` default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src *; media-src *; object-src 'none'; frame-src *; `;

/**
 * Creates the tiny host HTML page that contains the sandboxed iframe.
 */
const createHostHtml = (fileUri, networkAllowed) => {
  const policy = networkAllowed ? cspNetworkAllowed : cspDefault;
  // We must escape quotes for the HTML attribute
  const safePolicy = policy.replace(/"/g, '&quot;');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Secure Host</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body, html { margin: 0; padding: 0; height: 100%; width: 100%; overflow: hidden; }
        iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; }
      </style>
    </head>
    <body>
      <iframe src="${fileUri}" csp="${safePolicy}"></iframe>
    </body>
    </html>
  `;
};


const App = () => {
  const [fileUri, setFileUri] = useState(null); // This will be the file:///... URI
  const [error, setError] = useState(null);
  const [isNetworkAllowed, setIsNetworkAllowed] = useState(false);

  // This will hold the tiny host HTML string
  const [hostHtml, setHostHtml] = useState(null);

  // When fileUri or policy changes, regenerate the host HTML
  useEffect(() => {
    if (fileUri) {
      setHostHtml(createHostHtml(fileUri, isNetworkAllowed));
    } else {
      setHostHtml(null);
    }
  }, [fileUri, isNetworkAllowed]);


  /**
   * This function ONLY copies the file and sets the URI.
   * No reading or writing of large strings.
   */
  const loadHtmlFile = async (isTestFile = false) => {
    // This is the fix for the event handler bug you spotted.
    // If isTestFile is not explicitly true, it's a button press.
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
        } else {
          console.log('Test file not found.');
          return;
        }
      } catch (e) {
        console.error('Test file check failed:', e);
        return;
      }
    } else {
      let pickResult;
      try {
        console.log('Attempting to call pick() with types.allFiles...');
        const [result] = await pick({ type: [types.allFiles] });
        pickResult = result;
      } catch (pickError) {
        // ... (your existing picker error handling is perfect)
        return;
      }
      if (!pickResult || !pickResult.uri) { return; }

      sourceUri = pickResult.uri;
      localFile = `${RNFS.CachesDirectoryPath}/${Date.now()}_picked_file.html`;
    }

    // 1. JUST COPY THE FILE. This is fast.
    try {
      console.log(`Attempting RNFS.copyFile from ${sourceUri} to ${localFile}`);
      await RNFS.copyFile(sourceUri, localFile);
      console.log('RNFS.copyFile successful.');
      
      // 2. SET THE URI. This triggers the useEffect.
      setFileUri('file://' + localFile);
      console.log('--- loadHtmlFile successful! ---');

    } catch (copyError) {
      console.error('!!! ERROR in RNFS.copyFile step:', copyError);
      setError('Failed to copy file from picker: ' + copyError.message);
    }
  };

  // Auto-load test file on mount
  useEffect(() => {
    // We add the '0 &&' you did to disable auto-load for now
    // To re-enable, remove the '0 &&'
    if (0 && !fileUri) { 
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
      {/* We now check for hostHtml, not fileUri */}
      {!hostHtml ? (
        <View style={styles.menu}>
          <Text style={styles.title}>My Static App Viewer</Text>
          <Checkbox
            label="Allow HTTP Networking"
            value={isNetworkAllowed}
            onValueChange={setIsNetworkAllowed}
          />
          {/* This correctly calls loadHtmlFile with no arguments */}
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
          allowFileAccess={true}
          allowUniversalAccessFromFileURLs={true}
          allowFileAccessFromFileURLs={true}
          
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
