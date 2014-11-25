#!/usr/bin/python

"""
Reads the .tar.bzip file provided by offical FTP
"""

import os
import sys
import time
import tarfile

from plot import plotter
from headerFileReader import extractConvertTable
from split import splitter


try:
    tar = tarfile.open(sys.argv[1], 'r:bz2')
except:
    sys.exit(1)

try:
    if len(sys.argv) >= 3:
        outputPath = sys.argv[2]
        if len(sys.argv) >= 4:
            logFilePath = os.path.realpath(sys.argv[3])
        else:
            logFilePath = False
    else:
        outputPath = '.'
        logFilePath = False
    outputPath = os.path.realpath(outputPath)
except Exception,e:
    print e
    sys.exit(2)

print "> Reading the content of tarball..."

tarInfos = tar.getmembers()

print "> Got %d files." % len(tarInfos)
print "> Analyze contents."

geossFile = []
headerFile = {}
for each in tarInfos:
    if each.name.endswith('.geoss'):
        if each.size == 18000000 or each.size == 288000000:
            geossFile.append(each)
    elif each.name.startswith('hdr') and each.name.endswith('.txt'):
        headerFile[each.name] = each

print "> Found %d possible .geoss file." % len(geossFile)
print "> Generating commands for plotting geoss files..."

for each in geossFile:
    CHANNEL = each.name[8:11]
    DK = each.name[7]
    TIME = each.name[12:24]

    fileType = 'jpg'
    if DK == '1':
        mode = "full scan"
        filename = '%s.%s.FULL.%s' % (TIME, CHANNEL, fileType)
    elif DK == '2':
        mode = "north heimsphere scan"
        filename = '%s.%s.NORTH.%s' % (TIME, CHANNEL, fileType)
    else:
        mode = "south heimsphere scan"
        filename = '%s.%s.SOUTH.%s' % (TIME, CHANNEL, fileType)
    print "> Start generation of image, channel %s, time %s, mode %s." % (CHANNEL, TIME, mode)

    print "> Extracting file..."
    try:
        sourceFile = tar.extractfile(each)
        source = sourceFile.read()
        headerFile = tar.extractfile("hdr_%s_%s_001.txt" % (CHANNEL.lower(), TIME))
        header = headerFile.read()
        convertTable = extractConvertTable(header)
    except Exception,e:
        print e
        print "Error! Cannot extract this file. Skip."
        continue

    print "> Configuring plotter..."
    p = plotter()

    if 'VIS' == CHANNEL:
        p.setScaleParameters(False, '%')
        p.setConvertTable(convertTable)
        p.setSourceRegion(59.995, 85.005, -60.005, -154.995)
        p.setDataDimension(12000, 12000)
        p.setDK(DK)
        p.setDataResolution(0.01, 0.01)
    else:
        p.setScaleParameters(True, 'K')
        p.setConvertTable(convertTable)
        p.setSourceRegion(59.98, 85.02, -60.02, -154.98)
        p.setDataDimension(3000, 3000)
        p.setDK(DK)
        p.setDataResolution(0.04, 0.04)

    print "> Plotting data..."
    img, scaleInfo = p.plotData(source)

    #print "> Adding coastlines..."
    #img = p.plotCoastlines(img)

    print "> Adding coordinate lines..."
    img = p.plotCoordinateLines(img)

    print "> Packing image..."
    img, imgDataRegion = p.packImage(img, timestamp=TIME, channel=CHANNEL, scale=scaleInfo)

    imgSavePath = os.path.join(outputPath, filename)
    img.save(imgSavePath)
    print ">>> Image saved to: %s\n" % filename

    if logFilePath != False:
        logStr = '\t'.join([filename, str(time.time()), str(imgDataRegion), str(scaleInfo)])
        logStr += '\n'
        open(logFilePath, 'a+').write(logStr)
        print ">>> Log to [%s]: %s" % (logFilePath, logStr)

    print "> Splitting image for map viewer..."
    try:
        splitter(imgSavePath, img)
    except Exception,e:
        print "!> Error: %s" % e
