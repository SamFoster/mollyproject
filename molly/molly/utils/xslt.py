from lxml import etree

from django.template import loader, Context

def transform(document, template_name, template_context=None):

    # Load a template and turn it into an XSL template
    template = loader.get_template(template_name)
    template = template.render(Context(template_context or {}))
    template = etree.XSLT(etree.fromstring(template))

    return template(document)