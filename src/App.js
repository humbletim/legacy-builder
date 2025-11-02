import React, { useState, useEffect } from 'react';
import { SafeAreaView, Button, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { pick, types } from '@react-native-documents/picker';
import RNFS from 'react-native-fs'; // We still need this
import buildInfo from './build-info';

const App = () => {
  const [fileUri, setFileUri] = useState(null);
  const [error, setError] = useState(null);
  const [isNetworkAllowed, setIsNetworkAllowed] = useState(false);

  // This test file logic is still fine
  useEffect(() => {
    const testModePath = RNFS.DownloadDirectoryPath + '/test.html';
    const checkTestFile = async () => {
      try {
        if (await RNFS.exists(testModePath)) {
          console.log('Test file found, loading it.');
          setFileUri('file://' + testModePath);
        } else {
          console.log('Test file not found.');
        }
      } catch (e) {
        console.error('Test file check failed:', e);
      }
    };
    checkTestFile();
  }, []);




const onShouldStartLoad = (request) => {
  const { url } = request;

  // 1. Always allow the *very first* load of the local file itself
  //    (This is the most important rule!)
  if (url === fileUri) {
    return true;
  }

  // 2. If networking is DISALLOWED
  if (!isNetworkAllowed) {
    // 3. Block any request that is NOT a local file
    //    (You might want to refine this, but 'http' covers 99%)
    if (url.startsWith('http://') || url.startsWith('https://')) {
      console.log('CSP-BLOCK (via onShouldStartLoad):', url);
      return false; // <-- THE BLOCK
    }
  }

  // 4. Otherwise (networking is allowed, or it's a local file-to-file request),
  //    allow the request to proceed.
  return true;
};


  const loadHtmlFile = async () => {
    console.log('--- loadHtmlFile started ---');
    setError(null);
    
    let pickResult;
    try {
      console.log('Attempting to call pick() with types.allFiles...');
      const [result] = await pick({
        type: [types.allFiles],
      });
      console.log('pick() successful.');
      pickResult = result;
    } catch (pickError) {
      if (pickError.code === 'DOCUMENT_PICKER_CANCELED') {
        console.log('User cancelled the picker.');
        setError('File selection was cancelled.');
      } else {
        console.error('!!! ERROR in pick() step:', pickError);
        setError('Failed during file pick step: ' + pickError.message);
      }
      return;
    }

    if (!pickResult || !pickResult.uri) {
      console.error('!!! ERROR: pickResult is invalid or has no URI.');
      setError('File picker returned an invalid result.');
      return;
    }

    console.log(`Source URI is: ${pickResult.uri}`);
    const sourceUri = pickResult.uri;
    let localFile;

    // 2. MANUALLY COPY THE FILE (We know this is fast)
    try {
      localFile = `${RNFS.CachesDirectoryPath}/${Date.now()}_picked_file.html`;
      console.log(`Attempting RNFS.copyFile from ${sourceUri} to ${localFile}`);
      await RNFS.copyFile(sourceUri, localFile);
      console.log('RNFS.copyFile successful.');
    } catch (copyError) {
      console.error('!!! ERROR in RNFS.copyFile step:', copyError);
      setError('Failed to copy file from picker: ' + copyError.message);
      return;
    }

    // 3. SET THE *LOCAL FILE* URI (NOT the content:// URI)
    try {
      console.log(`Attempting to setFileUri to: 'file://${localFile}'`);
      setFileUri('file://' + localFile);
      console.log('--- loadHtmlFile successful! ---');
    } catch (stateError) {
      console.error('!!! ERROR setting state:', stateError);
      setError('Failed to display file: ' + stateError.message);
    }
  };

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
      {!fileUri ? (
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
          source={{ uri: fileUri }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowFileAccess={true}
          allowUniversalAccessFromFileURLs={true}
          allowFileAccessFromFileURLs={true}
          baseUrl={fileUri}
          onShouldStartLoadWithRequest={onShouldStartLoad}
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
