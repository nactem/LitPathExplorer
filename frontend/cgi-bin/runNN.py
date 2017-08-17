#!/usr/bin/python
# -*- coding: UTF-8 -*-

# Import modules for CGI handling 
import cgi, cgitb, json, sys
#import os, os.path
import pickle, os
import numpy as np


path = './cgi-bin/networks/'
initialName = 'nnWeights'

def nonlin(x,deriv=False):
    if(deriv==True):
        return x*(1-x)

    return 1/(1+np.exp(-x))
    
cgitb.enable()

dataFromJS = json.load(sys.stdin)
matrix = []
for node in dataFromJS['eventNodes']:
    #matrix.append([node['polarity'], node['nPapers'], node['altmetricPct'], node['languageCertainty'], node['impactFactor'], node['nCitations'],1]);
    matrix.append([node['nPapers'], node['altmetricPct'], node['languageCertainty'], node['impactFactor'], node['nCitations'],1]);
    
#put it as numpy array
X = np.array(matrix)

# # Used for debugging only
# with open('./cgi-bin/log','w') as f2:
    # for i,j in enumerate(matrix):
        # for q,w in enumerate(j):
            # if type(w)==type(None):
                # f2.write(str(i) + ' ' + str(j) + '\n')

                
userId = dataFromJS['userId']

if (userId!= None) and (os.path.isfile(path + initialName + userId)):
    with open(path + initialName + userId,'rb') as f:
        weights = pickle.load(f)
        NNread = userId
else:
    with open(path + initialName,'rb') as f:
        weights = pickle.load(f)
        NNread = 'initial'
    
syn0, syn1 = weights

pl1 =  nonlin(np.dot(X,syn0))
pl2 =  nonlin(np.dot(pl1,syn1))
   
    
cgi_result={}

cgi_result['values'] = pl2.tolist()
cgi_result['NNread'] = NNread;

print 'Content-Type: application/json\n\n'
print json.dumps(cgi_result)