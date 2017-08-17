
# coding: utf-8

# In[116]:

#The output of this script is the evidence file with sentences grouped by paper, #citations count by event, altmetric scores by event
import json
import csv
import datetime
import pandas as pd
import locale 
import math

locale.setlocale(locale.LC_NUMERIC, 'French_Canada.1252')


# In[113]:

#load evidence data as dictionary
with open('12K.ext.noC2.json') as data_file:  
    dataEvidence = json.load(data_file)

#load mapping data as dictionary
with open('pubmedCentralMapping110417.json') as data_file:  
    mappingData = json.load(data_file)

#load article meta-data as dictionary
with open('articleMetaData110417.json') as data_file:  
    publicationMetaData = json.load(data_file)
    
#load journal IF as data frame
journalStats = pd.read_csv('Indice de Impacto_2015.csv')


# In[5]:

#create new dictionary with model element as main index
dataOutput = {}
for elem in dataEvidence:
    dataOutput[elem[u'event_model_element']]=elem
    del elem['event_model_element']


# In[127]:

def getPubmedId(someId,mappingData):
    return mappingData[someId[:-4]]


# In[128]:

def computeEventCitations(evidence,mappingData,pubMetaData):
    outputObj = []
    paperMentioned = {}
    for obj in evidence:
        #translate to pubmedId
        pubmedId = getPubmedId(obj["paper_id"], mappingData)
        if (pubmedId in pubMetaData) and (not(pubmedId in paperMentioned)): 
            outputObj.append(pubMetaData[pubmedId]["pmcrefcount"] if pubMetaData[pubmedId]["pmcrefcount"] != "" else 0)
            paperMentioned[pubmedId] = True
    return outputObj


# In[35]:

def computeAltmetricScore(evidence,mappingData,pubMetaData):
    outputObj = {"score":[],"pct":[]}
    paperMentioned = {}
    for obj in evidence:
        #translate to pubmedId
        pubmedId = getPubmedId(obj["paper_id"], mappingData)
        if (pubmedId in pubMetaData) and (not(pubmedId in paperMentioned)): 
            outputObj["score"].append(pubMetaData[pubmedId]["altmetric"]["score"] if "altmetric" in pubMetaData[pubmedId] else 0)
            if "altmetric" in pubMetaData[pubmedId]:
                if (pubMetaData[pubmedId]["altmetric"]["context"] != None) and (bool(pubMetaData[pubmedId]["altmetric"]["context"])):
                    outputObj["pct"].append(pubMetaData[pubmedId]["altmetric"]["context"]["all"]["pct"])
                else:
                    outputObj["pct"].append(0);
            else:
                outputObj["pct"].append(0);
            
            paperMentioned[pubmedId] = True
    return outputObj


# In[123]:

def computeRecency(evidence,mappingData,pubMetaData):
    outputObj = []
    paperMentioned = {}
    for obj in evidence:
        #translate to pubmedId
        pubmedId = getPubmedId(obj["paper_id"], mappingData)
        if (pubmedId in pubMetaData) and (not(pubmedId in paperMentioned)):
            if "pubdate" in pubMetaData[pubmedId]:
                try:
                    date = datetime.datetime.strptime(pubMetaData[pubmedId]["pubdate"], "%Y %b %d").date()
                except:
                    try:
                        date = datetime.datetime.strptime(pubMetaData[pubmedId]["pubdate"], "%Y %b").date()
                    except:
                        try:
                            date = datetime.datetime.strptime(pubMetaData[pubmedId]["pubdate"], "%Y").date()
                        except:
                            try:
                                date = datetime.datetime.strptime(pubMetaData[pubmedId]["pubdate"][:4], "%Y").date()
                            except:
                                date = None
                                print pubMetaData[pubmedId]["pubdate"]
                            
            outputObj.append(date.strftime("%Y %m %d") if date!=None else "")   
            paperMentioned[pubmedId] = True
    return outputObj


# In[124]:

def computeJournalIF(evidence,mappingData,pubMetaData, journalStats):
    outputObj = []
    paperMentioned = {}
    for obj in evidence:
        #translate to pubmedId
        pubmedId = getPubmedId(obj["paper_id"], mappingData)
        if (pubmedId in pubMetaData) and (not(pubmedId in paperMentioned)): 
            if ("issn" in pubMetaData[pubmedId]) and (pubMetaData[pubmedId]["issn"] != ""):
                if not journalStats['Impact Factor'][journalStats['ISSN']==pubMetaData[pubmedId]["issn"]].empty:
                    #print(type(journalStats['Impact Factor'][journalStats['ISSN']==pubMetaData[pubmedId]["issn"]].iloc[0]))
                    #print(journalStats['Impact Factor'][journalStats['ISSN']==pubMetaData[pubmedId]["issn"]].iloc[0])
                    if type(journalStats['Impact Factor'][journalStats['ISSN']==pubMetaData[pubmedId]["issn"]].iloc[0])==float:
                        value = 0
                    else:
                        value = locale.atof(journalStats['Impact Factor'][journalStats['ISSN']==pubMetaData[pubmedId]["issn"]].iloc[0])
                else:
                    #ISSN not found in csv
                    #Let's try ESSN
                    if ("essn" in pubMetaData[pubmedId]) and (pubMetaData[pubmedId]["essn"] != ""):
                        if not journalStats['Impact Factor'][journalStats['ISSN']==pubMetaData[pubmedId]["essn"]].empty:
                            
                            if type(journalStats['Impact Factor'][journalStats['ISSN']==pubMetaData[pubmedId]["essn"]].iloc[0])==float:
                                value = 0
                            else:
                                value = locale.atof(journalStats['Impact Factor'][journalStats['ISSN']==pubMetaData[pubmedId]["essn"]].iloc[0])
                        else:
                            value = 0
                    else:
                        #ESSN not found in csv (as ISSN)
                        value = 0
            else:
                #ISSN not found in API
                #Let's try ESSN
                if ("essn" in pubMetaData[pubmedId]) and (pubMetaData[pubmedId]["essn"] != ""):
                    if not journalStats['Impact Factor'][journalStats['ISSN']==pubMetaData[pubmedId]["essn"]].empty:
                        
                        if type(journalStats['Impact Factor'][journalStats['ISSN']==pubMetaData[pubmedId]["essn"]].iloc[0])==float:
                            value = 0
                        else:
                            value = locale.atof(journalStats['Impact Factor'][journalStats['ISSN']==pubMetaData[pubmedId]["essn"]].iloc[0])
                    else:
                        value = 0
                else:
                    #ESSN not found in csv (as ISSN)
                    value = 0
            outputObj.append(value) 
            
            
            paperMentioned[pubmedId] = True
    return outputObj


# In[129]:
cont = 0
for key, value in dataOutput.iteritems():
    cont = cont + 1
    #check if any text evidence has been found
    if len(dataOutput[key]['meta']['enriched_evidence']['evidence'])>0:
        
        dataOutput[key]['meta']['enriched_evidence']['eventCitations'] = computeEventCitations(dataOutput[key]['meta']['enriched_evidence']['evidence'],mappingData, publicationMetaData)
        
        dataOutput[key]['meta']['enriched_evidence']['eventAltmetricScore'] = computeAltmetricScore(dataOutput[key]['meta']['enriched_evidence']['evidence'],mappingData, publicationMetaData)
        
        dataOutput[key]['meta']['enriched_evidence']['pubDates'] = computeRecency(dataOutput[key]['meta']['enriched_evidence']['evidence'],mappingData, publicationMetaData)
        
        dataOutput[key]['meta']['enriched_evidence']['impactFactor'] = computeJournalIF(dataOutput[key]['meta']['enriched_evidence']['evidence'],mappingData, publicationMetaData,journalStats)
    if cont%1000==0:
        print("{} textual evidences processed".format(str(cont)))


# In[10]:

#save data to disk
with open('out.full.cc.direct1104217.json','w') as data_out:
    json.dump(dataOutput,data_out)

