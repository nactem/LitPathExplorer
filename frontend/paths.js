var GLOBALscriptSuffixTreeURL, GLOBALscriptExportNetwork, pathSavedNetworks,GLOBALscriptLoggingURL;

if (linux){
    GLOBALscriptEventOverridenURL = serverHostName + wsgiPrefix + '/saveOverriddenEvents'; 
    GLOBALscriptReadEventOverriddenURL = serverHostName + wsgiPrefix + '/readOverriddenEvents'; 
    GLOBALscriptRetrainNN = serverHostName + wsgiPrefix + '/retrainNN'; 
    GLOBALscriptRunNN = serverHostName + wsgiPrefix + '/runNN'; 
    GLOBALscriptSuffixTreeURL = serverHostName + wsgiPrefix + '/suffixprefixtree'; 
    GLOBALscriptLemmatizerURL = serverHostName + wsgiPrefix + '/lemmatizer'; 
    GLOBALscriptExportNetwork = serverHostName + wsgiPrefix + '/saveNetwork'; 
    GLOBALscriptLoggingURL = serverHostName + wsgiPrefix + '/log';     
    pathSavedNetworks = serverHostName + location.pathname + '/cgi-bin/savedNetworks/';     
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
    pathSavedNetworks = './cgi-bin/savedNetworks/';
}