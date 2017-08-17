#!/usr/bin/python
# -*- coding: UTF-8 -*-

# Import modules for CGI handling 
import cgi, cgitb, json, sys
#import os, os.path
#import time
cgitb.enable()

request = json.load(sys.stdin)

arrayOut=[]

for eventNodes in request:
    obj={}
    for key in eventNodes:
        if (key=='nCitations') or (key=='altMetricPct') or (key=='recency') or (key=='impactFactor') or (key=='nPapers') or (key=='languageCertainty') or (key=='polarity'):
            obj[key] =  eventNodes[key]
    arrayOut.append(obj.copy())

with open('./trainingData.json', 'w') as outfile:
    json.dump(arrayOut, outfile)
    
    
cgi_result={}

cgi_result['ok'] = True

print 'Content-Type: application/json\n\n'
print json.dumps(cgi_result)