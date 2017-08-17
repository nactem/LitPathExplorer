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
    
    headers = ["normalisedName", "precision 1-hop","recall 1-hop", "precision 2-hop","recall 2-hop","|hatS1|","|D1|","|S1|", "|hatS2|","|D2|","|S2|"]
    spamwriter.writerow(headers)
    for node in dataFromJS["results"]:
        #newRow = []    
        #newRow = addToRow (node,["Event"],["modelElement","normalisedName", "inModel","altmetricPct", "impactFactor", "languageCertainty", "nCitations", "nPapers", "recency", "polarity","value"], newRow)
   
        spamwriter.writerow(node)
   
cgi_result={}

cgi_result['result'] = fileName

print 'Content-Type: application/json\n\n'
print json.dumps(cgi_result)