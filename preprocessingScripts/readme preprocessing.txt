Generate necessary data for LitPathExplorer and the succeeding pre-processing script

1 Process BioPAX model 
Use:
- python parserBioPAX_XMI.py [XMI-formatted BioPAX model] [output model file]
E.g.: python parserBioPAX_XMI.py ./data/Ras-2-neighborhood_synonyms.xmi ./data/outputFull.json

2 Extract publication meta-data 
Use:
- python crawlPubMedMetaData [textual evidence] [mappings output file] [metadata output file] ([previousPubmedCentralIDMappings] [previousPubmedMetaData])

E.g: python crawlPubMedMetaData.py ./data/12K.ext.noC2.json ./data/pubmedCentralMapping.json ./data/articleMetaData.json 

or 

E.g: python crawlPubMedMetaData.py ./data/12K.ext.noC2.json ./data/pubmedCentralMappingNew.json ./data/articleMetaDataNew.json ./data/pubmedCentralMappingOld.json ./data/articleMetaDataOld.json

3 Process textual evidence, so that it is indexed by model element instead of an array  and compute event breakdown (processJSONEvidences)
Use:
python processJSONEvidences.py [textual evidence] [pubmedcentral mapping data] [article meta-data] [journal IF] [output file processed JSON evidence]
3-a Update all the file names in processJSONEvidences (
3-b python processJSONEvidences ./data/12K.ext.noC2.json ./data/pubmedCentralMapping.json ./data/articleMetaData.json ./data/impactFactor.csv ./data/out.full.cc.json

After running all these the files to be copied to LitPathExplorer/data are:
-[output model file]
-[output file processed JSON evidence]

and to LitPathExplorer/data/meta-data are:
-[pubmedcentral mapping data] [article meta-data]


