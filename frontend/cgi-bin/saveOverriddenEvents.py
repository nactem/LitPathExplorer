#!/usr/bin/python
# -*- coding: UTF-8 -*-

# Import modules for CGI handling 
import cgi, cgitb, json, sys
import pickle, os

# allow cgi debugging
cgitb.enable()

#set constants
path = './cgi-bin/overrides/'
initialName = 'eventOverrides'

#read data from JS
dataFromJS = json.load(sys.stdin)
userId = dataFromJS['userId']
nodeId = dataFromJS['nodeId']
value = dataFromJS['nodeValue']

#check if user's data exists
if (userId!= None) and (os.path.isfile(path + initialName + userId)):
    #read the user's file of overriden events
    with open(path + initialName + userId,'rb') as f:
        overriddenEvents = pickle.load(f)
        eventsRead = userId
else:
    #start from an empty dict
    overriddenEvents = {}
    eventsRead = 'blank'

# reading matrix from nodes
overriddenEvents[nodeId] = value

#save data to disk
with open(path+initialName+userId,'wb') as f:
    pickle.dump(overriddenEvents, f)


cgi_result={}

cgi_result['eventsRead'] = eventsRead;

print 'Content-Type: application/json\n\n'
print json.dumps(cgi_result)