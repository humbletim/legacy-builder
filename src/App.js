import React, { useState, useEffect } from 'react';
import { SafeAreaView, Button, StyleSheet, View, Text, PermissionsAndroid } from 'react-native';
import { WebView } from 'react-native-webview';
import { pick, types } from '@react-native-documents/picker';
import RNFS from 'react-native-fs'; // We still need this
import buildInfo from './build-info';

const App = () => {
  // We ONLY store the URI, not the content.
  const [fileUri, setFileUri] = useState(null);
  const [error, setError] = useState(null);

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

  return (
    <SafeAreaView style={styles.container}>
      {!fileUri ? (
        <View style={styles.menu}>
          <Text style={styles.title}>My Static App Viewer</Text>
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
          source={{ uri: fileUri }} // This will now be a 'file://' URI
          javaScriptEnabled={true}
          domStorageEnabled={true}
          
          // These are ESSENTIAL for file:// to work
          allowFileAccess={true}
          allowFileAccessFromFileURLs={true}
          allowUniversalAccessFromFileURLs={true}
          
          // We set the baseUrl to the file URI
          baseUrl={fileUri} 
          
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
