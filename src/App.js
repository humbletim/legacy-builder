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
 * Creates the tiny host HTML page.
 * This page's only job is to fetch the *real* content and
 * document.write() it with the CSP tag prepended.
 */
const createHostHtml = (fileUri, networkAllowed) => {
  const policy = networkAllowed ? cspNetworkAllowed : cspDefault;
  // Make the policy safe for a JS string
  const jsSafePolicy = policy.replace(/\s+/g, ' ').trim();

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Loading...</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body, html { 
          margin: 0; padding: 0; height: 100%; width: 100%; 
          display: flex; justify-content: center; align-items: center;
          font-family: sans-serif; background-color: #f0f0f0;
        }
      </style>
    </head>
    <body>
      <p>Loading Content...</p>
      
      <script>
        (async () => {
          const fileUri = '${fileUri}';
          const cspPolicy = '${jsSafePolicy}';
          const cspTag = '<meta http-equiv="Content-Security-Policy" content="' + cspPolicy + '">';

          try {
            console.log('Fetching content from: ' + fileUri);
            const response = await fetch(fileUri);
            if (!response.ok) {
              throw new Error('Failed to fetch file: ' + response.statusText);
            }
            const html = await response.text();
            
            console.log('Content fetched, writing to document...');
            document.open();
            // Write the CSP tag FIRST, then the rest of the HTML
            document.write(cspTag + html);
            document.close();
          } catch (e) {
            console.error('Failed to load content:', e);
            document.body.innerHTML = '<h1>Error</h1><p>' + e.message + '</p>';
          }
        })();
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
