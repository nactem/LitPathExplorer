#!/usr/bin/python
# -*- coding: UTF-8 -*-

# Import modules for CGI handling 
import cgi, cgitb, json, sys
#import os, os.path
#import time
cgitb.enable()


#Applies generalized suffix trees to a list of sentences. Keeps values from the sentences
#Taken from Ben Langmead John Hopkings University
#Modified by Axel J. Soto University of Manchester
from nltk.stem import WordNetLemmatizer

wn= WordNetLemmatizer()

request = json.load(sys.stdin)

cgi_result={}
cgi_result['result'] = [];
for verb in request['verbs']:
    #cgi_result['result'].append(wn.lemmatize(verb, pos='v'))
    cgi_result['result'].append(wn.lemmatize(verb))

print 'Content-Type: application/json\n\n'
print json.dumps(cgi_result["result"])