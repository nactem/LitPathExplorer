package uk.ac.nactem.uima;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;

import jp.ac.u_tokyo.s.is.www_tsujii.tools.enju.EnjuConstituent;
import jp.ac.u_tokyo.s.is.www_tsujii.tools.enju.EnjuSentence;
import jp.ac.u_tokyo.s.is.www_tsujii.tools.enju.EnjuToken;

import org.apache.uima.UimaContext;
import org.apache.uima.analysis_component.JCasAnnotator_ImplBase;
import org.apache.uima.analysis_engine.AnalysisEngineProcessException;
import org.apache.uima.cas.FSIterator;
import org.apache.uima.cas.FeatureStructure;
import org.apache.uima.jcas.JCas;
import org.apache.uima.jcas.cas.FSArray;
import org.apache.uima.jcas.tcas.Annotation;
import org.apache.uima.resource.ResourceInitializationException;
import org.u_compare.shared.syntactic.SyntacticAnnotation;

import uk.ac.nactem.bigm.MachineLearningUtils;
import uk.ac.nactem.bigm.MetaKnowledgeUtils;
import uk.ac.nactem.uima.cas.bionlpst.Attribute;
import uk.ac.nactem.uima.cas.bionlpst.Entity;
import uk.ac.nactem.uima.cas.bionlpst.Event;
import uk.ac.nactem.uima.cas.semantic.NamedEventParticipant;
import uk.ac.nactem.uima.ml.Instance;
import uk.ac.nactem.uima.ml.NameValuePair;

public class RuleFeatureExtractionBroad  extends JCasAnnotator_ImplBase {
	public static final String PARAM_SEP = "Sep";

	private ArrayList<String> clueList;
	private LinkedHashMap<String, ArrayList<String>> clueMap;
	private Map<String,List<Attribute>> attributeMap;
	private ArrayList<String> featureVectorNames;
	private HashMap<String,String> features;
	public static final String PARAM_NAME_RULEFILE = "RuleFile"; //file to read rules from
	private boolean hasIncomingInstances;
	private File ruleFile;
	private List<String> ruleList; //used just to store rule names for features
	public void initialize(UimaContext aContext) throws ResourceInitializationException {
		try {
			ruleFile = new File((String)(aContext.getConfigParameterValue(PARAM_NAME_RULEFILE)));
			clueList = intitialiseClueList(ruleFile);
			ruleList = intitialiseRuleList(ruleFile);
			intitialiseMap(ruleFile);
			initialiseFeatures();
		}
		catch (Exception e) {
			throw new ResourceInitializationException(e);
		}
	}

	private List<String> intitialiseRuleList(File file) {
		ArrayList<String> list = new ArrayList<String>();
		try {
			BufferedReader reader = new BufferedReader(new FileReader(file));
			String rule;
			while((rule = reader.readLine())!=null){
				list.add(rule);
			}
			reader.close();
		} catch (IOException e) {
			e.printStackTrace();
		}
		return list;
	}

	private void intitialiseMap(File file) {
		clueMap = new LinkedHashMap<String, ArrayList<String>>();
		try {
			BufferedReader reader = new BufferedReader(new FileReader(file));
			String line;
			while((line = reader.readLine())!=null){
				String clue = line.split("_")[0];
				String rule = line;
				ArrayList<String> ruleList;
				if(!clueMap.containsKey(clue)){
					ruleList = new ArrayList<String>();
				}
				else{
					ruleList = clueMap.get(clue);
				}
				ruleList.add(rule);
				clueMap.put(clue, ruleList);

				if(line.split("_").length>3){
					clue = line.split("_")[1];
					rule = line;
					if(!clueMap.containsKey(clue)){
						ruleList = new ArrayList<String>();
					}
					else{
						ruleList = clueMap.get(clue);
					}
					ruleList.add(rule);
					clueMap.put(clue, ruleList);
				}
			}
			reader.close();
		} catch (IOException e) {
			e.printStackTrace();
		}
	}

	private ArrayList<String> intitialiseClueList(File file) {
		ArrayList<String> clueList = new ArrayList<String>();
		try {
			BufferedReader reader = new BufferedReader(new FileReader(file));
			String line;
			while((line = reader.readLine())!=null){
				System.out.println(line);
				clueList.add(line.split("_")[0]);
				if(line.split("_").length>3){
					clueList.add(line.split("_")[1]);
				}
			}
			reader.close();
		} catch (IOException e) {
			e.printStackTrace();
		}
		return clueList;
	}

	//initialise vectors for features and feature names with default values to ensure consistent feature number
	private void initialiseFeatures() {
		featureVectorNames = new ArrayList<String>();
		features = new HashMap<String, String>();
		for (int i = 0; i < ruleList.size(); i++){
			featureVectorNames.add(ruleList.get(i));
			features.put(ruleList.get(i),"0");
		}
	}



	public void process(JCas jcas) throws AnalysisEngineProcessException {
		//keep track of Attributes coming from gold standard data
		attributeMap = MetaKnowledgeUtils.populateAttributeMap(jcas, "");
		hasIncomingInstances = MachineLearningUtils.containsInstances(jcas);
		FSIterator<Annotation> sentenceIterator = jcas.getAnnotationIndex(EnjuSentence.type).iterator();



		while (sentenceIterator.hasNext()) {
			EnjuSentence sentence = (EnjuSentence) sentenceIterator.next();

			FSIterator<Annotation> eventIterator = jcas.getAnnotationIndex(Event.type).subiterator(sentence);
			while (eventIterator.hasNext()) {
				HashMap<String, String> ruleFeatures = new HashMap<String, String>(features);
				Event event = (Event) eventIterator.next();

				List<String> ruleHits = check4clues(event, jcas,  sentence);

				for(String ruleHit : ruleHits){
					ruleFeatures.put(ruleHit, "1");
				}	

				// write the features out to the CAS
				// make a new instance, which we will populate with data.
				Instance currentInstance = null;

				// we wrap this in a try catch statement, as checkInstance may cause
				// an error if no instance alreasy exists for the event
				System.out.println("Processing : "+ event.getId() + " with size : ");

				// write the features out to the CAS
				// make a new instance, which we will populate with data.
				try
				{
					if(hasIncomingInstances){
						currentInstance = MetaKnowledgeUtils.checkInstance(jcas, event);
					}
					else{
						currentInstance = new Instance(jcas);
						// changed the lines below to instead get existing Attribute from the CAS;
						// since this is not a dimension-specific feature generator, this does not care about the 
						// attribute name

						if (event!=null) {
							List<Attribute> attributeList = attributeMap.get(event.getId());
							if (attributeList!=null && attributeList.size()>0) {
								currentInstance.setFeatureStructure(attributeList.get(0));
							}
							else {
								//create a new Attribute if none are found; means we are in classification mode
								Attribute attribute = new Attribute(jcas);
								attribute.setAnnotation(event);
								attribute.setAttributeName("Rule");
								currentInstance.setFeatureStructure(attribute);
							}
							currentInstance.addToIndexes(jcas);
						}
					}


					List<NameValuePair> nameValuePairs = new ArrayList<NameValuePair>();

					// this will hold the "String Valued Vector" parameter
					FSArray fsArray = new FSArray(jcas, featureVectorNames.size());
					for (int index = 0; index < featureVectorNames.size(); index++)
					{
						NameValuePair instanceFeature = new NameValuePair(jcas);
						instanceFeature.setName("rule_"+featureVectorNames.get(index));
						instanceFeature.setValue(ruleFeatures.get(featureVectorNames.get(index)));
						fsArray.set(index, instanceFeature);
						nameValuePairs.add(instanceFeature);
					} // for index

					MachineLearningUtils.appendFeatures(jcas, currentInstance, nameValuePairs);
				}//try
				catch(Exception e) {
					System.err.println("No instance for event with ID: " + event.getId());
				}
			}
		}
		//	transferToCAS(jcas, eventList, finFeatureVectors, finFeatureVectorNames, finLabels);
	}

	private List<String> check4clues(Event event, JCas jcas,  EnjuSentence sentence) {
		List<String> hitList = new ArrayList<String>();
		boolean uncertainty = false;
		FSIterator<Annotation> tokenIterator = jcas.getAnnotationIndex(EnjuToken.type).subiterator(sentence);
		while (tokenIterator.hasNext()){
			EnjuToken currToken = (EnjuToken) tokenIterator.next();
			String clueString = currToken.getBase();
			if(clueList.contains(clueString)){
				ArrayList<String> rules = clueMap.get(clueString);
				uncertainty = false;
				for(String rule: rules){
					if(rule.contains("\\+")){
						if(!uncertainty)
							uncertainty = handleMultiWordCues(event, sentence, jcas, currToken, rule);
					}
					else{
						String [] ruleParts = rule.split("_");

						if(rule.contains("D0")){
							if(ruleParts[2].equals("Arg1")){
								if(!uncertainty)
									uncertainty =  D0Arg1(event, sentence, jcas, currToken);
							}
							else if(ruleParts[2].equals("Arg2")){
								if(!uncertainty)
									uncertainty =  D0Arg2(event, sentence, jcas, currToken);
							}
						}
						else if(rule.contains("D1")){
							if(ruleParts[3].equals("Arg1")){
								if(ruleParts[4].equals("Arg1")){
									if(!uncertainty)
										uncertainty =  D1Arg1Arg1(event, sentence, jcas, currToken, ruleParts[0], ruleParts[1]);
								}
								else if(ruleParts[4].equals("Arg2")){
									if(!uncertainty)
										uncertainty =  D1Arg1Arg2(event, sentence, jcas, currToken, ruleParts[0], ruleParts[1]);
								}
							}
							else if(ruleParts[3].equals("Arg2")){
								if(ruleParts[4].equals("Arg1")){
									if(!uncertainty)
										uncertainty =  D1Arg2Arg1(event, sentence, jcas, currToken, ruleParts[0], ruleParts[1]);
								}
								else if(ruleParts[4].equals("Arg2")){
									if(!uncertainty)
										uncertainty =  D1Arg2Arg2(event, sentence, jcas, currToken, ruleParts[0], ruleParts[1]);
								}
							}
						}
						else if(rule.contains("DW")){
							if(ruleParts[3].equals("Arg1")){
								if(ruleParts[4].equals("Arg2")){
									if(!uncertainty)
										uncertainty =  DWArg1Arg2(event, sentence, jcas, currToken, ruleParts[0], ruleParts[1]);
								}
							}
							else if(ruleParts[3].equals("Arg2")){
								if(ruleParts[4].equals("Arg1")){
									if(!uncertainty)
										uncertainty =  DWArg2Arg1(event, sentence, jcas, currToken, ruleParts[0], ruleParts[1]);
								}

							}
						}
						else if(rule.contains("DN")){
							if(ruleParts[2].equals("Arg1")){
								if(!uncertainty)
									uncertainty =  DNArg1(event, sentence, jcas, currToken);
							}
							else if(ruleParts[2].equals("Arg2")){
								if(!uncertainty)
									uncertainty =  DNArg2(event, sentence, jcas, currToken);
							}
						}
					}
					if(uncertainty){
						System.out.println("CZrules: " + rule + " - " + clueString + " - " + event.getId());

						hitList.add(rule);
					}
				}
			}
		}


		return hitList;
	}

	
	private boolean handleMultiWordCues(Event event, EnjuSentence sentence, JCas jcas, EnjuToken currToken,
			String rule) {

		//break up rule in parts
		String rulePhrase = rule.split("\\+")[0];
		String[] rulePhraseParts = rulePhrase.split("_");
		String ruleMainCue = rule.split("\\+")[1].split("_")[0];
		String [] ruleParts = rule.split("\\+")[1].split("_");

		//check phrase is existing in the sentence
		int l = rulePhraseParts.length;
		FSIterator<Annotation> tokenIteratorInner = jcas.getAnnotationIndex(EnjuToken.type).subiterator(sentence);
		boolean stop = false, start=false;
		int count = 0;
		List<EnjuToken> tokens = new ArrayList<EnjuToken>();
		while(tokenIteratorInner.hasNext() && !stop){
			EnjuToken currTokenInner = (EnjuToken) tokenIteratorInner.next();
			if(!start && currTokenInner.getBase().equals(currToken.getBase()) && currTokenInner.getBegin()==currToken.getBegin()
					&& currTokenInner.getEnd()==currToken.getEnd()){
				start = true;
				tokens.add(currTokenInner);
				count++;
			}
			if(start && rulePhraseParts[count].toLowerCase().equals(currTokenInner.getBase().toLowerCase())){
				tokens.add(currTokenInner);
				count++;
				if(count>=l){
					stop=true;
				}
			}
			else if(start){
				start = false;
				count = 0;
				tokens = new ArrayList<EnjuToken>();
			}
		}
		//if phrase found
		if (tokens.size()==rulePhraseParts.length){
			for(EnjuToken token : tokens){
				if(token.getBase().toLowerCase().equals(ruleMainCue.toLowerCase())){ //get the token that is the main part of the rule (linked to trigger)
					if(rule.contains("D0")){
						if(ruleParts[2].equals("Arg1"))
							return  D0Arg1(event, sentence, jcas, token);
						else if(ruleParts[2].equals("Arg2"))
							return  D0Arg2(event, sentence, jcas, token);
					}
					else if(rule.contains("D1")){
						if(ruleParts[3].equals("Arg1")){
							if(ruleParts[4].equals("Arg1"))
								return  D1Arg1Arg1(event, sentence, jcas, token, ruleParts[0], ruleParts[1]);
							else if(ruleParts[4].equals("Arg2")){
								return  D1Arg1Arg2(event, sentence, jcas, token, ruleParts[0], ruleParts[1]);
							}
							else if(ruleParts[3].equals("Arg2")){
								if(ruleParts[4].equals("Arg1")){
									return D1Arg2Arg1(event, sentence, jcas, token, ruleParts[0], ruleParts[1]);
								}
								else if(ruleParts[4].equals("Arg2")){
									return  D1Arg2Arg2(event, sentence, jcas, token, ruleParts[0], ruleParts[1]);
								}
							}
						}
						else if(rule.contains("DW")){
							if(ruleParts[3].equals("Arg1")){
								if(ruleParts[4].equals("Arg2")){
									return DWArg1Arg2(event, sentence, jcas, token, ruleParts[0], ruleParts[1]);
								}
							}
							else if(ruleParts[3].equals("Arg2")){
								if(ruleParts[4].equals("Arg1")){
									return  DWArg2Arg1(event, sentence, jcas, token, ruleParts[0], ruleParts[1]);
								}

							}
						}
						else if(rule.contains("DN")){
							if(ruleParts[2].equals("Arg1")){
								return DNArg1(event, sentence, jcas, token);
							}
							else if(ruleParts[2].equals("Arg2")){
								return  DNArg2(event, sentence, jcas, token);
							}
						}
					}
				}
			}
		}
		else
			return false;
		
		return false;
	}


	private boolean DNArg2(Event event, EnjuSentence sentence, JCas jcas, EnjuToken currToken) {

		int triggerBegin = event.getBegin();
		int triggerEnd = event.getEnd();
		EnjuToken previous = null;

		FSIterator<Annotation> tokenIterator = jcas.getAnnotationIndex(EnjuToken.type).subiterator(sentence);
		while (tokenIterator.hasNext()){
			EnjuToken token = (EnjuToken) tokenIterator.next();
			String tString = token.getBase();
			if(currToken.equals(tString)){
				if(previous!=null){
					if(previous.getBase().toLowerCase().equals("no") || previous.getBase().toLowerCase().equals("not")){
						SyntacticAnnotation arg2Node = token.getArg2();	
						if(!(arg2Node == null)){
							if(semHeadMatches(jcas, arg2Node, triggerBegin, triggerEnd)){
								return true;

							}
						}
						arg2Node = previous.getArg2();	
						if(!(arg2Node == null)){
							if(semHeadMatches(jcas, arg2Node, triggerBegin, triggerEnd)){
								return true;
							}
						}

					}
				}			
			}//if clue found
			previous = token;
		}//while tokenIterator

		return false;
	}


	private boolean DNArg1(Event event, EnjuSentence sentence, JCas jcas, EnjuToken currToken) {

		int triggerBegin = event.getBegin();
		int triggerEnd = event.getEnd();
		EnjuToken previous = null;

		FSIterator<Annotation> tokenIterator = jcas.getAnnotationIndex(EnjuToken.type).subiterator(sentence);
		while (tokenIterator.hasNext()){
			EnjuToken token = (EnjuToken) tokenIterator.next();
			String tString = token.getBase();
			if(currToken.equals(tString)){
				if(previous!=null){
					if(previous.getBase().toLowerCase().equals("no") || previous.getBase().toLowerCase().equals("not")){
						SyntacticAnnotation arg1Node = token.getArg1();	
						if(!(arg1Node == null)){
							if(semHeadMatches(jcas, arg1Node, triggerBegin, triggerEnd)){
								return true;
							}
						}
						arg1Node = previous.getArg1();	
						if(!(arg1Node == null)){
							if(semHeadMatches(jcas, arg1Node, triggerBegin, triggerEnd)){
								return true;
							}
						}
					}
				}
			}//if clue found
			previous = token;
		}//while tokenIterator

		return false;
	}


	private boolean DWArg1Arg2(Event event, EnjuSentence sentence, JCas jcas, EnjuToken currToken, String ruleParts, String ruleParts2) {
		int triggerBegin = event.getBegin();
		int triggerEnd = event.getEnd();

		String tString = currToken.getBase();
		if(tString.equals(ruleParts)){
			SyntacticAnnotation arg1Node = currToken.getArg1();
			if(!(arg1Node == null)){
				if(arg1Node.getClass().getName().equalsIgnoreCase("jp.ac.u_tokyo.s.is.www_tsujii.tools.enju.EnjuConstituent")){
					EnjuConstituent arg1NodeEC = (EnjuConstituent) arg1Node;
					EnjuToken semHeadToken = getSemHeadToken(arg1NodeEC, jcas);
					if(semHeadToken != null){
						String clueCandidate = semHeadToken.getBase().toLowerCase();
						if (ruleParts2.equals(clueCandidate)){
							SyntacticAnnotation secarg2Node = currToken.getArg2();
							if(!(secarg2Node == null)){
								if(semHeadMatches(jcas, secarg2Node, triggerBegin, triggerEnd)){
									return true;								}
							}
						}
					}
				}
			}
		}
		return false;
	}


	private boolean DWArg2Arg1(Event event, EnjuSentence sentence, JCas jcas, EnjuToken currToken, String ruleParts, String ruleParts2) {
		int triggerBegin = event.getBegin();
		int triggerEnd = event.getEnd();

		String tString = currToken.getBase();
		if(tString.equals(ruleParts)){
			SyntacticAnnotation arg2Node = currToken.getArg2();
			if(!(arg2Node == null)){
				if(arg2Node.getClass().getName().equalsIgnoreCase("jp.ac.u_tokyo.s.is.www_tsujii.tools.enju.EnjuConstituent")){
					EnjuConstituent arg2NodeEC = (EnjuConstituent) arg2Node;
					EnjuToken semHeadToken = getSemHeadToken(arg2NodeEC, jcas);
					if(semHeadToken != null){
						String clueCandidate = semHeadToken.getBase().toLowerCase();
						if (ruleParts2.equals(clueCandidate)){
							SyntacticAnnotation secarg1Node = currToken.getArg1();
							if(!(secarg1Node == null)){
								if(semHeadMatches(jcas, secarg1Node, triggerBegin, triggerEnd)){
									return true;								}
							}
						}
					}
				}
			}
		}
		return false;
	}



	private boolean D1Arg2Arg2(Event event, EnjuSentence sentence, JCas jcas, EnjuToken currToken, String ruleParts, String ruleParts2) {
		FSIterator<Annotation> eventIterator = jcas.getAnnotationIndex(Event.type).subiterator(sentence);

		int triggerBegin = event.getBegin();
		int triggerEnd = event.getEnd();

		SyntacticAnnotation arg2Node = currToken.getArg2();	
		if(!(arg2Node == null)){
			if(arg2Node.getClass().getName().equalsIgnoreCase("jp.ac.u_tokyo.s.is.www_tsujii.tools.enju.EnjuConstituent")){
				EnjuConstituent arg2NodeEC = (EnjuConstituent) arg2Node;
				EnjuToken semHeadToken = getSemHeadToken(arg2NodeEC, jcas);
				if(semHeadToken != null){
					boolean semHeadIsATrigger = isATrigger(semHeadToken, eventIterator);
					if(!semHeadIsATrigger){
						String middleWordLemma = semHeadToken.getBase();
						if(middleWordLemma.toLowerCase().equals(ruleParts2.toLowerCase())){
							SyntacticAnnotation secondArg2Node = semHeadToken.getArg2();
							if(semHeadMatches(jcas, secondArg2Node, triggerBegin, triggerEnd)){
								return true;
							}
						}//if semHead is not a trigger
					}	
				}
			}
		}
		return false;
	}


	private boolean D1Arg1Arg2(Event event, EnjuSentence sentence, JCas jcas, EnjuToken currToken, String ruleParts, String ruleParts2) {
		FSIterator<Annotation> eventIterator = jcas.getAnnotationIndex(Event.type).subiterator(sentence);

		int triggerBegin = event.getBegin();
		int triggerEnd = event.getEnd();


		SyntacticAnnotation arg1Node = currToken.getArg1();	
		if(!(arg1Node == null)){
			if(arg1Node.getClass().getName().equalsIgnoreCase("jp.ac.u_tokyo.s.is.www_tsujii.tools.enju.EnjuConstituent")){
				EnjuConstituent arg1NodeEC = (EnjuConstituent) arg1Node;
				EnjuToken semHeadToken = getSemHeadToken(arg1NodeEC, jcas);
				if(semHeadToken != null){
					boolean semHeadIsATrigger = isATrigger(semHeadToken, eventIterator);
					if(!semHeadIsATrigger){
						String middleWordLemma = semHeadToken.getBase();
						if(middleWordLemma.toLowerCase().equals(ruleParts2.toLowerCase())){
							SyntacticAnnotation secondArg2Node = semHeadToken.getArg2();
							if(semHeadMatches(jcas, secondArg2Node, triggerBegin, triggerEnd)){
								return true;
							}
						}
					}//if semHead is not a trigger
				}	
			}
		}

		return false;
	}


	private boolean D1Arg2Arg1(Event event, EnjuSentence sentence, JCas jcas, EnjuToken currToken, String ruleParts, String ruleParts2) {
		FSIterator<Annotation> eventIterator = jcas.getAnnotationIndex(Event.type).subiterator(sentence);

		int triggerBegin = event.getBegin();
		int triggerEnd = event.getEnd();
		SyntacticAnnotation arg2Node = currToken.getArg2();	
		if(!(arg2Node == null)){
			if(arg2Node.getClass().getName().equalsIgnoreCase("jp.ac.u_tokyo.s.is.www_tsujii.tools.enju.EnjuConstituent")){
				EnjuConstituent arg2NodeEC = (EnjuConstituent) arg2Node;
				EnjuToken semHeadToken = getSemHeadToken(arg2NodeEC, jcas);
				if(semHeadToken != null){
					boolean semHeadIsATrigger = isATrigger(semHeadToken, eventIterator);
					if(!semHeadIsATrigger){
						String middleWordLemma = semHeadToken.getBase();
						if(middleWordLemma.toLowerCase().equals(ruleParts2.toLowerCase())){
							SyntacticAnnotation secondArg1Node = semHeadToken.getArg1();
							if(semHeadMatches(jcas, secondArg1Node, triggerBegin, triggerEnd)){
								return true;
							}
						}//if semHead is not a trigger
					}		
				}
			}
		}
		return false;
	}


	private boolean D1Arg1Arg1(Event event, EnjuSentence sentence, JCas jcas, EnjuToken currToken, String ruleParts, String ruleParts2) {
		FSIterator<Annotation> eventIterator = jcas.getAnnotationIndex(Event.type).subiterator(sentence);
		int triggerBegin = event.getBegin();
		int triggerEnd = event.getEnd();

		SyntacticAnnotation arg1Node = currToken.getArg1();	
		if(!(arg1Node == null)){
			if(arg1Node.getClass().getName().equalsIgnoreCase("jp.ac.u_tokyo.s.is.www_tsujii.tools.enju.EnjuConstituent")){
				EnjuConstituent arg2NodeEC = (EnjuConstituent) arg1Node;
				EnjuToken semHeadToken = getSemHeadToken(arg2NodeEC, jcas);
				if(semHeadToken != null){

					boolean semHeadIsATrigger = isATrigger(semHeadToken, eventIterator);
					if(!semHeadIsATrigger){
						String middleWordLemma = semHeadToken.getBase();
						if(middleWordLemma.toLowerCase().equals(ruleParts2.toLowerCase())){
							SyntacticAnnotation secondArg1Node = semHeadToken.getArg1();
							if(semHeadMatches(jcas, secondArg1Node, triggerBegin, triggerEnd)){
								return true;
							}
						}
					}//if semHead is not a trigger
				}
			}		
		}
		return false;
	}


	private boolean D0Arg2(Event event, EnjuSentence sentence, JCas jcas, EnjuToken currToken) {
		//System.out.println(currToken.getBase() + "-" + event.getId());
		int triggerBegin = event.getBegin();
		int triggerEnd = event.getEnd();

		SyntacticAnnotation arg2Node = currToken.getArg2();	
		if(!(arg2Node == null)){
			if(semHeadMatches(jcas, arg2Node, triggerBegin, triggerEnd)){
				//System.out.println(currToken.getBase() + "-" + event.getId() + " TRUE");
				return true;
			}
		}

		return false;
	}


	private boolean D0Arg1(Event event, EnjuSentence sentence, JCas jcas, EnjuToken currToken) {

		int triggerBegin = event.getBegin();
		int triggerEnd = event.getEnd();
		SyntacticAnnotation arg1Node = currToken.getArg1();	
		if(!(arg1Node == null)){
			if(semHeadMatches(jcas, arg1Node, triggerBegin, triggerEnd)){
				return true;
			}
		}

		return false;

	}


	//Helper Method: Follows the route of semantic head constituents and returns the final semantic head (EnjuToken) for the given EnjuConstituent
	private EnjuToken getSemHeadToken(EnjuConstituent ec, JCas jcas){
		EnjuToken semHeadToken = new EnjuToken(jcas);
		Annotation semHead = ec.getSemHead();
		if(semHead!=null){
			if(semHead.getClass().getName().equalsIgnoreCase("jp.ac.u_tokyo.s.is.www_tsujii.tools.enju.EnjuToken")){
				semHeadToken = (EnjuToken) semHead;
			}
			else{
				EnjuConstituent semHeadEC = (EnjuConstituent) semHead;
				semHeadToken = getSemHeadToken(semHeadEC, jcas);
			}
			return semHeadToken;
		}
		return null;

	}

	//Helper Method: Checks if a given token is a trigger
	private boolean isATrigger(EnjuToken token, FSIterator<Annotation> eventIterator){
		boolean result = false;
		while (eventIterator.hasNext()) {
			Event currEvent = (Event) eventIterator.next();
			int b1 = token.getBegin();
			int b2 = currEvent.getBegin();
			int e1 = token.getEnd();
			int e2 = currEvent.getEnd();
			if(b1==b2 && e1==e2){
				result = true;
				break;
			}
		}
		return result;
	}

	//Helper Method: Checks if the given node has a semantic head with given begin and end values
	private boolean semHeadMatches(JCas jcas, SyntacticAnnotation someNode, int begin, int end){
		boolean result = false;
		if(!(someNode == null)){
			if(someNode.getClass().getName().equalsIgnoreCase("jp.ac.u_tokyo.s.is.www_tsujii.tools.enju.EnjuConstituent")){
				EnjuConstituent modNodeEC = (EnjuConstituent) someNode;
				EnjuToken smeHeadToken = getSemHeadToken(modNodeEC, jcas);
				if(smeHeadToken == null){
					return false;
				}
				if((smeHeadToken.getBegin() <= begin) && (smeHeadToken.getEnd() >= end)){
					result = true;
				}
			}	
		}
		return result;
	}






}
