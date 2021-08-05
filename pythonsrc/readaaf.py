
#######################################################
# Created by: Gergely Vaczi
# vaczideveloper@gmail.com
#######################################################

from zeep import Client, Settings
from pymongo import MongoClient
from pprint import pprint
import xml.etree.ElementTree as ET
import collections
import subprocess
import schedule
import time
from timecode import frames_to_timecode


#######################################################
# Request the AAF from Web Services based on the MOB ID
#######################################################

def request_aaf(InterplayURI, MobID):
    wsdl = 'http://192.168.112.23/services/Assets?wsdl'

    headerArr = {}
    settings = Settings(strict=False, xml_huge_tree=True,extra_http_headers=headerArr)
    client = Client(wsdl)

    cli = client.get_element('ns0:UserCredentials')
    header_value_1 = cli(Username='cloudadmin', Password='Avid.1234')

    try:
        def read_aaf(client, InterplayURI):
            r = client.service.GetLatest(InterplayURI = InterplayURI, _soapheaders=[header_value_1]) #TODO to use env variable for the password
            return r.File
        f = open('../processing/temp.aaf', 'wb')
        f.write(read_aaf(client, InterplayURI))
        f.close()
    except Exception as e:
        print('Cannot get AAF from the PAM: ' + str(e))
        db.mobid_collection.update_one({'mobid' : MobID }, {'$set': {'status': 'Error'}})
  


#######################################################
# Convert AAF to XML
#######################################################

def aaf_to_xml(MobID):
    source = "temp.aaf"
    target = "temp.xml"
    try:
        subprocess.run(r"../processing/aaffmtconv.exe -xml ../processing/{} ../processing/{}".format(source, target))
    except Exception as e:
        print('Cannot convert AAF to XML: ' + str(e))
        db.mobid_collection.update_one({'mobid' : MobID }, {'$set': {'status': 'Error'}})


#######################################################
# Remove 'namespace' from the converted XML
#######################################################

def prepare_xml(source):
    fin = open(source, "rt")
    data = fin.read()
    data = data.replace('xmlns="http://www.aafassociation.org/aafx/v1.1/20090617"', '')
    fin.close()
    fin = open(source, "wt")
    fin.write(data)
    fin.close()


#######################################################
#   Extracting the following from the converted xml:
#       - sequencename
#       - duration of every componment
#       - trucknumber of every component
#       - name of every component (filename)
#######################################################

def parse_xml(source, MobID):
    try:
        tree = ET.parse(source)
    except Exception as e:
        print(str(e))

    root = tree.getroot()

    sequencename = ''
    idtoname = {}
    tracknumbers = collections.defaultdict(list)
    TN = {}

    componentelement = {
        'Sequence' : '',
        'SourcePackageID' : '',
        'ComponentLength' : '',
        'PackageName' : '',
        'SourceTrackID' : []
    }
    componentlist = []


    # Finding the sequence name
    for item in root.iterfind('.//CompositionPackage'):
        PackageName = item.find('PackageName').text
        PackageID = item.find('PackageID').text.replace('.', '')
        if PackageID == '{}{}'.format(Prefix, MobID.replace('-', '')):
            sequencename = PackageName
            print(sequencename)
    
    
    # Binding the ID to the clipname
    for item in root.findall('.//Preface/ContentStorageObject/ContentStorage/Packages/MaterialPackage'):
        PackageName = item.find('PackageName').text
        PackageID = item.find('PackageID').text
        idtoname[PackageID] = PackageName


    # Finding the tracknumbers
    for item in root.findall('.//TimelineTrack'):  
        EssenceTrackNumber = item.find('.//EssenceTrackNumber')
        try:
            SourcePackageID = item.find('.//SourcePackageID').text
            tracknumbers[SourcePackageID].append(int(EssenceTrackNumber.text))
        except Exception as e:
            print(str(e))

    #for key, value in tracknumbers.items() :
    #    print (key, value)

    # Creating the component element
    #for item in root.findall('.//CompositionPackage/PackageTracks/TimelineTrack/TrackSegment/Sequence/ComponentObjects/SourceClip'):
    #for item in root.findall('.//SourcePackage/PackageTracks/TimelineTrack/TrackSegment/Sequence/ComponentObjects/SourceClip'):
    for item in root.findall('.//SourceClip'):
        SourcePackageID = item[2].text
        ComponentLength = item[3].text
        StartPosition = item[0].text
        SourceTrackID = item[1].text

        try:
            ComponentLength = int(ComponentLength)
        except:
            ComponentLength = 0
        
        if SourcePackageID in idtoname:
            PackageName = idtoname[SourcePackageID]
        else:
            PackageName = ''
        
        componentelement['Sequence'] = sequencename
        #componentelement['SourcePackageID'] = SourcePackageID
        componentelement['ComponentLength'] =  frames_to_timecode(ComponentLength, 25, False)
        componentelement['PackageName'] = PackageName
        componentelement['SourceTrackID'] = 0

        audiocomponent = False
        #TODO find out the source type from the XML
        filetypes = ["mp3", "wav", "MP3", "WAV"]
        if(any(filetype in componentelement['PackageName'] for filetype in filetypes)):
            audiocomponent = True

        if len(item[2].text) > 5 and componentelement not in componentlist:
            if componentelement['PackageName'] != '':
                componentlist.append(componentelement.copy())

    return componentlist


#######################################################
# Generating the EDL based on the previously extracted metadata
#######################################################
#TODO implement generate_edl()
def generate_edl():
    print('edl')


#######################################################
# Reading the database and starting the process for
# every entry with the status 'Queued'.
# Set status to 'Done' once data has been processed.
#######################################################

def worker(): 
    queued = db.mobid_collection.find({'status': 'Queued'})
    for item in queued:
        MobID = item['mobid']
        InterplayURI = 'interplay://SnittWG?mobid={}'.format(MobID)
        request_aaf(InterplayURI, MobID)
        aaf_to_xml(MobID)

        source = '../processing/temp.xml'
        prepare_xml(source)
        componentlist = parse_xml(source, MobID)

        for item in componentlist:
            print(item)

        db.mobid_collection.update_one({'mobid' : MobID }, {'$set': {'status': 'Done'}})

    

#######################################################
# Service entry point
#######################################################     

if __name__ == "__main__":
    
    client = MongoClient('mongodb://localhost:27017')
    db = client.musicextractor
    Prefix = 'urn:smpte:umid:'

    scheduledfor = 1
    schedule.every(scheduledfor).minutes.do(worker)

    while True:
        schedule.run_pending()
        time.sleep(1)

    client.close
    
    #MobID = '060a2b340101010501010f1013-000000-9dbe4dcd9369a505-5d022c41384f-6c1b'
    #MobID = '060a2b340101010501010f1013-000000-d21aed449368a505-466c64510650-8bac'

    
    
    
