
import os.path
from django.core.management.base import NoArgsCommand

from xml.etree import ElementTree as ET
from django.contrib.gis.geos import Point
from mobile_portal.oxpoints.models import Entity, EntityType
   
class Command(NoArgsCommand):
    option_list = NoArgsCommand.option_list
    help = "Loads NaPTAN bus stop data."
    
    requires_model_validation = True

    ENGLAND_OSM_BZ2_URL = 'http://download.geofabrik.de/osm/europe/great_britain/england.osm.bz2'
    NS = '{http://www.naptan.org.uk/}'

    def add_busstop_entity_type(self):
        self.entity_type, created = EntityType.objects.get_or_create(slug='busstop')
        self.entity_type.verbose_name = 'bus stop'
        self.entity_type.verbose_name_plural = 'bus stops'
        self.entity_type.source = 'naptan'
        self.entity_type.id_field = 'atco_code'
        self.entity_type.show_in_category_list = False
        self.entity_type.save()

    def parse_busstops(self, filename):

        def NS(elements):
            return "/".join((Command.NS + e) for e in elements.split('/'))

        xml = ET.parse(filename)
        
        stops, atco_codes = xml.findall('.//'+NS('StopPoint')), set()
        
        for stop in stops:
	
            if stop.attrib['Status'] == 'inactive':
                continue

            atco_code = stop.find(NS('AtcoCode')).text.strip()
            atco_codes.add (atco_code)

            translation = stop.find(NS('Place/Location/Translation'))
            location = float(translation.find(NS('Latitude')).text), float(translation.find(NS('Longitude')).text)
            
			#Description of stops
            descriptor = stop.find(NS('Descriptor'))
            title = "\n ".join("%s: %s" % (e.tag[len(Command.NS):], e.text) for e in descriptor)
            
            cnm, lmk, ind, str = [(descriptor.find(NS(s)).text if descriptor.find(NS(s)) != None else None) for s in ['CommonName', 'Landmark','Indicator','Street']]
            
            if lmk and ind and ind.endswith(lmk) and len(ind) > len(lmk):
                ind = ind[:-len(lmk)]
                
                
            if ind == 'Corner':
                title = "Corner of %s and %s" % (str, lmk)
            elif cnm == str:
                title = "%s, %s" % (ind, cnm)
            elif lmk == str and ind == lmk:
                title = "%s, %s" % (lmk, str)
            elif lmk != str:
                title = "%s %s, on %s" % (ind, lmk, str)
            else:
                title = "%s %s, %s" % (ind, lmk, cnm)
            
            entity, created = Entity.objects.get_or_create(atco_code = atco_code, entity_type=self.entity_type)
            entity.location = Point(location[1], location[0], srid=4326)
            entity.title = title
            entity.save()
    
        for entity in Entity.objects.filter(entity_type=self.entity_type):
            if not entity.atco_code in atco_codes:
                entity.delete()
                
    def handle_noargs(self, **options):

        self.add_busstop_entity_type()
        self.parse_busstops(os.path.join(
            os.path.dirname(__file__), 
            '../../data/NaPTAN340.xml',
        ))