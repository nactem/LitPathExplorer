#!/usr/bin/python
# -*- coding: UTF-8 -*-

# Import modules for CGI handling 
import cgi, cgitb, json, sys
#import os, os.path
from time import gmtime, strftime
import unicodecsv as csv

def addToRow(node,tripleNames,fields, output):
    for tN in tripleNames:
        for f in fields:
            output.append(node[tN][f])
    return output

cgitb.enable()

dataFromJS = json.load(sys.stdin)

fileName = dataFromJS["path"]

arrayOut=[]
with open(fileName, 'wb') as csvfile:
    spamwriter = csv.writer(csvfile, delimiter=',',encoding='utf-8')
    #headers = ["normalisedName_E1", "tagName_E1", "normalisedName_E2", "tagName_E1", "normalisedName_Event", "inModel","altmetricPct", "impactFactor", "languageCertainty", "nCitations", "nPapers", "recency", "polarity"]
    headers = ["modelElement","normalisedName", "inModel","altmetricPct", "impactFactor", "languageCertainty", "nCitations", "nPapers", "recency", "polarity","value"]
    spamwriter.writerow(headers)
    for node in dataFromJS["triples"]:
        newRow = []
        #newRow = addToRow (node,["E1"],["normalisedName","tagName"], newRow)
        #newRow = addToRow (node,["E2"],["normalisedName","tagName"], newRow)
        newRow = addToRow (node,["Event"],["modelElement","normalisedName", "inModel","altmetricPct", "impactFactor", "languageCertainty", "nCitations", "nPapers", "recency", "polarity","value"], newRow)
   
        spamwriter.writerow(newRow)
   
cgi_result={}

cgi_result['result'] = fileName

print 'Content-Type: application/json\n\n'
print json.dumps(cgi_result)