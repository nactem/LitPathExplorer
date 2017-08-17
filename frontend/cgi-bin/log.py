#!/usr/bin/python
# -*- coding: UTF-8 -*-

# Import modules for CGI handling 
import cgi, cgitb, json, sys
#import os, os.path
from time import gmtime, strftime

cgitb.enable()

dataFromJS = json.load(sys.stdin)

currentTimeStamp = strftime("%Y-%m-%d-%H-%M-%S", gmtime())
fileName = 'log' + str(dataFromJS['userId']) + '.log'

with open('./savedLogs/'+fileName, 'a') as logfile:
    logfile.write('Session:{5}, Operation:{0}, node: {1}, attributes:{2}, Old value:{3}, New value:{4}\n'.format(dataFromJS['operation'], dataFromJS['node'], dataFromJS['attributes'], dataFromJS['oldValue'], dataFromJS['newValue'], dataFromJS['session']))
        
cgi_result={}

cgi_result['result'] = fileName

print 'Content-Type: application/json\n\n'
print json.dumps(cgi_result)