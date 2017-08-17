#!/usr/bin/python
# -*- coding: UTF-8 -*-

# Import modules for CGI handling 
import cgi, cgitb, json, sys
#import os, os.path
from time import gmtime, strftime
import csv

cgitb.enable()

dataFromJS = json.load(sys.stdin)

currentTimeStamp = strftime("%Y-%m-%d-%H-%M-%S", gmtime())
fileName = 'exportData' + currentTimeStamp + '.csv'

arrayOut=[]
with open('./savedNetworks/'+fileName, 'wb') as csvfile:
    spamwriter = csv.writer(csvfile, delimiter=',')
    spamwriter.writerow(['Event normalised name', 'Event model element', 'Confidence value', 'Entity A normalised name', 'Entity A model element', 'Entity B normalised name', 'Entity B model element'])
    for row in dataFromJS:
        newRow = []
        for node in row:
            newRow.append(node['normalisedName'].encode("utf-8"))
            newRow.append(node['modelElement'].encode("utf-8"))
            if (node['tagName']=='Event'):
                newRow.append(str(node['value']))
        spamwriter.writerow(newRow)

    
    
cgi_result={}

cgi_result['result'] = fileName

print 'Content-Type: application/json\n\n'
print json.dumps(cgi_result)