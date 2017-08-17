
# coding: utf-8

# In[6]:

import json
import urllib2
import re
import time




with open('12K.ext.noC2.json') as data_file:  
    data1 = json.load(data_file)


# In[11]:

pubmedCentralMapping = {}
articleMetaData = {}

#read from previous run to avoid recrawling data (3 different APIs)
if (True):    
    with open('pubmedCentralMapping130217.json','r') as data_file:  
        pubmedCentralMapping = json.load( data_file)    
    with open('articleMetaData130217.json','r') as data_file:  
        articleMetaData = json.load(data_file)

        
      
        
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
        else:
            #print(str(pubmedId) + " already found!")
            a=1
            

            
with open('pubmedCentralMapping110417.json','w') as data_file:  
    json.dump(pubmedCentralMapping, data_file)    
with open('articleMetaData110417.json','w') as data_file:  
    json.dump(articleMetaData, data_file)    




