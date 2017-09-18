"""Extract publication meta-data. First argument is the textual evidence in JSON format (assuming that IDs are in pubmed central format), second argument is the output filename for the pubmedcentral mappings, and third argument is the output filename for the article meta-data. Optional arguments: the fourth arguments is a file with previously computed pubmedcentral mappings, and the fifth argument is a file with previously computed pubmed metadata."""
# coding: utf-8

# In[6]:

import json
import urllib2
import re
import time
import sys


if len(sys.argv) < 2:
    sys.exit("The JSON output with the textual evidence should be provided as a first parameter and the output filename as a second parameter")
else:
    JSONTextualEvidence = sys.argv[1]

with open(JSONTextualEvidence) as data_file:  
    data1 = json.load(data_file)


# In[11]:

pubmedCentralMapping = {}
articleMetaData = {}

#read from previous runs to avoid recrawling data (3 different APIs)
if len(sys.argv) > 4:    
    with open(sys.argv[4],'r') as data_file:  
        pubmedCentralMapping = json.load( data_file)    
    with open(sys.argv[5],'r') as data_file:  
        articleMetaData = json.load(data_file)

#for each evidence entry
for confObject in data1:
    for textualEvidence in confObject['meta']['enriched_evidence']['evidence']:
        paperId = textualEvidence['paper_id']
        pubmedCentralId = re.search('(PMC\d+).xml', paperId).group(1) #Extract pubmedCentralId
        if (not (pubmedCentralId in pubmedCentralMapping)) or (pubmedCentralMapping[pubmedCentralId] == -1):
            #transform pubmedCentral en pubmedId
            #check if not retrieved already
        
            print pubmedCentralId
            try:
                    result = urllib2.urlopen('https://www.ncbi.nlm.nih.gov/pmc/utils/idconv/v1.0/?tool=my_tool&email=my_email@example.com&ids='+pubmedCentralId+'&format=json')
                    
            except urllib2.HTTPError, e:
                print("PMC mapping API not found ") 
                print e
                pass
            else:
                resultJson = json.load(result)
                if u'pmid' in resultJson['records'][0]:
                    pubmedId = resultJson['records'][0][u'pmid']
                    pubmedCentralMapping[pubmedCentralId] = pubmedId
                    result.close()
                else:
                    pubmedCentralMapping[pubmedCentralId] = -1
                    pass
        else:
            pubmedId = pubmedCentralMapping[pubmedCentralId]
        if not (pubmedId in articleMetaData):
            #get article meta data
            try:
                resultJson2 = urllib2.urlopen('http://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&rettype=abstract&id='+ pubmedId)
            except urllib2.HTTPError, e:
                print("Entrez mapping API not found ")
                print e
                pass
            else:
                print(str(pubmedId) + " found now!")
                metadata = json.load(resultJson2)
                my_keys = ['authors','fulljournalname','pmcrefcount','pubtype','title','pages','volume','issue','pubdate','issn','essn']
                articleMetaData[pubmedId] = { my_key: metadata['result'][pubmedId][my_key] for my_key in my_keys }
                resultJson2.close()
                #get Altmetric data
                try:
                    resultJson3 = urllib2.urlopen('http://api.altmetric.com/v1/pmid/' + pubmedId)
                except urllib2.HTTPError, e:
                    print("Altmetric mapping API not found ")
                    print e
                else:
                    metadata = json.load(resultJson3)
                    my_keys = ['score','context','details_url']                            
                    articleMetaData[pubmedId]['altmetric'] = { my_key: (metadata[my_key] if my_key in metadata else {}) for my_key in my_keys }
                    resultJson3.close()

            
with open(sys.argv[2],'w') as data_file:  
    json.dump(pubmedCentralMapping, data_file)    
with open(sys.argv[3],'w') as data_file:  
    json.dump(articleMetaData, data_file)    




