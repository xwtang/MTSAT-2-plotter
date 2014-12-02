require([
    'jquery',
    'map',
], function(
    $,
    map
){
//////////////////////////////////////////////////////////////////////////////

/* Date concerning functions */

function validateDateFormat(s){
    if(!/^[0-9]{8}$/.test(s)) return false;
    var year = parseInt(s.slice(0,4), 10),
        month = parseInt(s.slice(4,6), 10),
        day = parseInt(s.slice(6, 8));
    if(year < 2014) return false;
    if(month < 1 || month > 12) return false;
    if(day < 1) return false;

    var dayMax = 0;
    if(2 == month){
        if( ((0 == year % 100)?(0 == year % 400):(0 == year % 4)) )
            // is leap year
            dayMax = 29;
        else
            dayMax = 28;
    } else {
        if(month <= 7)
            dayMax = ((1 == month % 2)?31:30);
        else
            dayMax = ((1 == month % 2)?30:31);
    };
    if(day > dayMax) return false;
    return [year, month, day]; 
};

function compareDate(a, b){
    function toTimestamp(s){
        var year = s.slice(0,4),
            month = s.slice(4,6),
            day = s.slice(6, 8);
        if(8 == s.length)
            return new Date(
                year + '-' + month + '-' + day + 'T'
                + '00:00Z'
            ).getTime();
        else {
            var hour = s.slice(8, 10),
                minute = s.slice(10, 12);
            return new Date(
                year + '-' + month + '-' + day + 'T'
                + hour + ':' + minute + 'Z'
            ).getTime();
        };
    };
    return (toTimestamp(a) - toTimestamp(b));
};


/* Get satellite image from given filename */

var loadData = function(filename, callback){
    if(!/^[0-9]{12}\.((IR[1-4])|VIS)\.(FULL|NORTH|SOUTH)\.(png|jpg)$/.test(filename))
        return false;

    var datemonth = filename.slice(0, 6);
    var url = '/data/' + datemonth + '/';
    url += filename.slice(0, 12);
    if(filename.slice(13, 15) == 'IR') 
        url += '.ir';
    else
        url += '.vis';
    url += '/' + filename;

    var img = new Image();
    img.src = url;
    img.onload = function(){
        callback(img);
    };
};


/* Retrive index file (log.txt) and auto parse */
var indexFileCache = {}, dataFileMetadata = {};
function loadIndexFile(dateMonth, callback){
    function parser(s){
        var sp = s.split('\n'), lp, range, filename, filenameS;
        for(var i in sp){
            if(!sp[i]) continue;
            lp = sp[i].trim().split('\t');
            range = lp[2].trim().slice(1,-1).split(',');
            scale = lp[3].trim().slice(1,-1).split(',');
            filename = lp[0].trim();
            filenameS = filename.split('.');
            dataFileMetadata[filename] = {
                'filename': filename,
                'time': filenameS[0],
                'date': filenameS[0].slice(0, 8),
                'dateMonth': filenameS[0].slice(0, 6),
                'channel': filenameS[1],
                'south': 'FULL' == filenameS[2] || 'SOUTH' == filenameS[2],
                'north': 'FULL' == filenameS[2] || 'NORTH' == filenameS[2],
                'type': filenameS[3],
                'range': {
                    x1: parseInt(range[0], 10),
                    y1: parseInt(range[1], 10),
                    x2: parseInt(range[2], 10),
                    y2: parseInt(range[3], 10),
                },
                'scale': {
                    min: parseInt(scale[0], 10),
                    max: parseInt(scale[1], 10),
                    inverted: ('VIS' == filenameS[1]),
                    unit: (('VIS' == filenameS[1])?'%':'K'),
                },
            };
        };
    };
    if(undefined !== indexFileCache[dateMonth]){
        parser(indexFileCache[dateMonth]);
        callback();
    } else {
        $.get(
            '/data/' + dateMonth + '/log.txt',
            function(s){
                indexFileCache[dateMonth] = s;
                parser(s);
                callback();
            }
        );
    };
};

//////////////////////////////////////////////////////////////////////////////

/* command to load a image, process it and show */

function showCloudAtlas(filename, callback){
    // bound to the button, which, when clicked, calls this function
    var metadata = dataFileMetadata[filename];
    if(!metadata) return alert('无数据。');

    function onImageRetrived(img){
        mapView.load(img, metadata);
        if(callback) callback();
    };

    loadData(filename, onImageRetrived);
};


/* filter date list */

var dataFilterStart, dataFilterEnd, dataFilterChannel,
    dataFilterNorth = true, dataFilterSouth = true;
function filterDateList(){
    // the filter updates the list in UI by given start and end.  date list
    // being filtered(`dataFileMetadata`) is maintained by 'loadIndexFile'
    // function.
    
    // append to list
    $('[name="data-list"]').empty();
    var list = [];
    
    for(var filename in dataFileMetadata){
        var metadata = dataFileMetadata[filename];
        if(!(
            compareDate(dataFilterStart, metadata.date) <= 0 &&
            compareDate(metadata.date, dataFilterEnd) <= 0
        ))
            continue;

        if(metadata.channel != dataFilterChannel)
            continue;

        if(
            (!metadata.north && dataFilterNorth) ||
            (!metadata.south && dataFilterSouth)
        )
            continue;

        list.push(metadata);
    };

    list.sort(function(a,b){
        return compareDate(b.time, a.time);
    });

    for(var i=0; i<list.length; i++){
        var display = list[i].time.slice(0,4) + '-'
                    + list[i].time.slice(4,6) + '-'
                    + list[i].time.slice(6,8)
                    + '<font color="#999">T</font>'
                    + list[i].time.slice(8, 10) + ':'
                    + list[i].time.slice(10,12)
                    + '<font color="#999">Z</font>'
        ;
        var title = 'UTC时刻 '
                    + list[i].time.slice(0,4) + '年'
                    + list[i].time.slice(4,6) + '月'
                    + list[i].time.slice(6,8)
                    + '日 '
                    + list[i].time.slice(8, 10) + '时'
                    + list[i].time.slice(10,12) + '分'
                    + ' 云图'
        ;
        $('[name="data-list"]').append($('<div>').append(
            $('<button>', {
                'type': 'button',
            })
                .html(display)
                .addClass('button-date')
                .click((function(f,t){
                    return function(){
                        var self = this;
                        showCloudAtlas(f, function(){
                            $('#viewer-title').text(t);
                            $('.button-date')
                                .removeClass('button-date-showing');
                            $(self).addClass('button-date-showing');
                        });
                    }
                })(list[i].filename, title))
        ));
    };
};


/* initialize interface */

function validateDateRange(){
    var viewDateRangeStart = $('[name="view-date-range-start"]').val(),
        viewDateRangeEnd = $('[name="view-date-range-end"]').val();

    // if validation passed, they will be numbers taken apart [YYYY, MM, DD]
    var dateRangeStart = validateDateFormat(viewDateRangeStart),
        dateRangeEnd = validateDateFormat(viewDateRangeEnd);
    
    if(false === dateRangeStart || false === dateRangeEnd)
        return false;

    if(compareDate(viewDateRangeStart, viewDateRangeEnd) > 0)
        return false;

    if(compareDate('20141119', viewDateRangeStart) > 0)
        return false;

    var nowtime = new Date(), nowtimeStr = '', nowtimeY, nowtimeM, nowtimeD;
    nowtimeY = nowtime.getUTCFullYear();
    nowtimeM = nowtime.getUTCMonth() + 1;
    nowtimeD = nowtime.getUTCDate();
    
    nowtimeStr = String(nowtimeY);
    if(nowtimeM < 10) nowtimeStr += '0';
    nowtimeStr += String(nowtimeM);
    if(nowtimeD < 10) nowtimeStr += '0';
    nowtimeStr += String(nowtimeD);

    if(compareDate(viewDateRangeEnd, nowtimeStr) > 0)
        return false;

    // [[YYYY, MM, DD], [YYYY, MM, DD], 'YYYYMMDD', 'YYYYMMDD']
    return [dateRangeStart, dateRangeEnd, viewDateRangeStart, viewDateRangeEnd];
};


$('#list-data').click(function(){
    var dateRange = validateDateRange();
    if(false === dateRange)
        return alert('输入的日期范围有误。起始日期必须早于终止日期，且不早于2014年11月19日; 终止日期不得晚于今日。');

    var year = dateRange[0][0], month = dateRange[0][1];

    // set date filter range
    dataFilterStart = dateRange[2]; // str
    dataFilterEnd = dateRange[3]; // str
    dataFilterChannel = $('[name="view-channel"]').val(); // str
    dataFilterNorth = $('[name="view-data-north"]').is(':checked');
    dataFilterSouth = $('[name="view-data-south"]').is(':checked');

    function toDateMonth(year, month){
        return String(year) + ((month < 10)?('0' + String(month)):String(month));
    };
    var list = [toDateMonth(year, month)];
    while(year != dateRange[1][0] && month != dateRange[1][1]){
        month += 1;
        if(month > 12){
            month = 1;
            year += 1;
        };
        list.push(toDateMonth(year, month));
    };

    for(var i=0; i<list.length; i++)
        loadIndexFile(list[i], filterDateList);
});

/*
mapView.statusSubscribers.push(function(){
    function format(v, digits){
        var s = String(v),
            d = s.indexOf('.');
        if(d < 0) return s + '.' + '000000000000000000'.slice(0, digits);
        return s.slice(0, d + 1 + digits);
    };
    var cursorPos = mapView.getCursorLatLng(), str = '';
    if(cursorPos.lat > 0)
        str += '北纬' + format(cursorPos.lat, 3) + '度';
    else if(cursorPos.lat < 0)
        str += '南纬' + format(-cursorPos.lat, 3) + '度';
    else
        str += '赤道';
    str += '<br />';

    if(cursorPos.lng > 0)
        str += '东经' + format(cursorPos.lng, 3) + '度';
    else
        str += '西经' + format(-cursorPos.lng, 3) + '度';

    $('#status-cursor-latlng').html(str);


    var cursorValue = mapView.getCursorValue(), 
        cursorValueUnit = mapView.getCursorValueUnit(),
        cursorValueShown = '';
    if('K' == cursorValueUnit)
        cursorValueShown = 
            format(cursorValue, 2) + " K / " + 
            format(cursorValue - 273.15, 2) + " &#x2103;"
        ;
    $('#status-cursor-value').html(cursorValueShown);
});
*/

//////////////////////////////////////////////////////////////////////////////
});