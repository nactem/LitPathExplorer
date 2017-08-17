var GLOBALscriptSuffixTreeURL, GLOBALscriptExportNetwork, pathSavedNetworks,GLOBALscriptLoggingURL;

if (linux){
    GLOBALscriptEventOverridenURL = 'http://nactem10.mib.man.ac.uk:5002/saveOverriddenEvents'; 
    GLOBALscriptReadEventOverriddenURL = 'http://nactem10.mib.man.ac.uk:5002/readOverriddenEvents'; 
    GLOBALscriptRetrainNN = 'http://nactem10.mib.man.ac.uk:5002/retrainNN'; 
    GLOBALscriptRunNN = 'http://nactem10.mib.man.ac.uk:5002/runNN'; 
    GLOBALscriptSuffixTreeURL = 'http://nactem10.mib.man.ac.uk:5002/suffixprefixtree'; 
    GLOBALscriptLemmatizerURL = 'http://nactem10.mib.man.ac.uk:5002/lemmatizer'; 
    GLOBALscriptExportNetwork = 'http://nactem10.mib.man.ac.uk:5002/saveNetwork'; 
    GLOBALscriptLoggingURL = 'http://nactem10.mib.man.ac.uk:5002/log';     
    pathSavedNetworks = 'http://nactem.ac.uk/LitPathExplorer_BI/savedNetworks/';     
}
else{
    GLOBALscriptEventOverridenURL = './cgi-bin/saveOverriddenEvents.py'
    GLOBALscriptReadEventOverriddenURL = './cgi-bin/readOverriddenEvents.py'
    GLOBALscriptRetrainNN = './cgi-bin/retrainNN.py'
    GLOBALscriptRunNN = './cgi-bin/runNN.py'
    GLOBALscriptLemmatizerURL = './cgi-bin/lemmatizer.py'; 
    GLOBALscriptSuffixTreeURL = './cgi-bin/suffixprefixtree.py'; 
    GLOBALscriptExportNetwork = './cgi-bin/saveNetwork.py'; 
    GLOBALscriptLoggingURL = './cgi-bin/log.py';     
    pathSavedNetworks = './savedNetworks/';
}