'use strict';
let mongoose        = require('mongoose');
let Announcement    = require('../models/announcement');
let utils           = require('../utils');
let middlewares     = require('../utils/middlewares');
let dependencies    = require('../utils/dependencies');

class AnnouncementAPI{

    static getAnnouncements(req, res, next){

        if (req.query) {
            Announcement.find(req.query)
                .then(announcements => {
                    if (announcements) {
                        utils.set_content_json(res, 200);
                        res.end(JSON.stringify(announcements));
                    } else {
                        utils.send_error_json(res, 400, "No announcements in database");
                    }
                })
                .catch(err => {
                    utils.send_error_json(res, 500, "Internal error!");
                })
        }
        else
            {
                Announcement.find({})
                    .then(announcements => {
                        if (announcements) {
                            utils.set_content_json(res, 200);
                            res.end(JSON.stringify(announcements));
                        } else {
                            utils.send_error_json(res, "No announcements in database");
                        }
                    })
                    .catch(err => {
                        utils.send_error_json(res, 500, "Internal error!");
                    })
            }

    }

    static getAnnouncementById(req, res, next){
        let annId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(annId)){
            utils.send_error_json(res, 400,"Invalid announcement id!");
        }
        Announcement.findById({_id: mongoose.Types.ObjectId(annId)})
            .then( announcement =>{
                if(announcement){
                    utils.set_content_json(res, 200);
                    res.end(JSON.stringify(announcement));
                }
                else{
                    utils.send_error_json(res, 400,"Announcement not found");
                }
            })
            .catch(err =>{
                utils.send_error_json(res, 500, "Internal error!");
            })
    }

    static addAnnouncement(req, res, next) {
        let new_ann = Announcement(req.body);
        new_ann.seller = req.user._id;
        let error = new_ann.validateSync();
        if (!error) {
            new_ann.save()
                .then(() => {
                    dependencies.add_user_announcement(req.user._id, new_ann._id, function (err) {
                        if(err){
                            utils.send_error_json(res, 400, err);
                        }else{
                            utils.send_success_json(res, "Announcement created!");
                        }
                    });
                })
                .catch(err => {
                    utils.send_error_json(res, 500, err);
                });
        } else {
            utils.send_error_json(res, error.message);
        }
    }

    static deleteAnnouncement(req, res, next){

        let annId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(annId)){
            utils.send_error_json(res, 400,"Invalid announcement id!");
        }
        annId = mongoose.Types.ObjectId(annId);
        req.user._id = mongoose.Types.ObjectId(req.user._id);
        Announcement.findOne({_id: annId})
            .then( ann =>{
                if(ann){
                    if(! ann.seller.equals(req.user._id)){
                        utils.send_error_json(res, 403, "Trying to remove other user's announcement!");
                        return;
                    }
                    dependencies.remove_announcement_from_user(req.user._id, annId,
                        function(err){
                            if(err){
                                utils.send_error_json(res, 500, "Failed removing announcement from seller!");
                            }
                            else {
                                ann.remove(err => {
                                    if (err) {
                                        utils.send_error_json(res, 500, "Failed removing announcement!");
                                    } else {
                                        utils.send_success_json(res, "Announcement removed!");
                                    }

                                });
                            }
                    });
                }
                else{
                    utils.send_error_json(res, 400, "Invalid announcement id!");
                }
            })
            .catch( err =>{
                utils.send_error_json(res, 500,"Failed removing announcement!");
            });

    }

    static updateAnnouncement(req, res, next){

        let annId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(annId)){
            utils.send_error_json(res, "Invalid announcement id!");
        }
        annId =  mongoose.Types.ObjectId(annId);
        Announcement.findOne({_id: annId})
            .then( ann => {
                return Object.assign(ann, req.body);
            })
            .then((model) => {
                return model.save();
            })
            .then((updatedModel) => {
                utils.send_success_json(res, 'Announcement Updated!')
            }).catch((err) => {
            utils.send_error_json(res, 500, err);
        });

    }

    static getMarkers(req, res, next){

        Announcement.find({})
            .then(announcements => {
                if(announcements){
                    utils.set_content_json(res, 200);

                    const markers = [];
                    announcements.forEach(element => {
                        const marker = {};
                        if(element.coordinates) {
                            marker.coordinates = element.coordinates;
                        }
                        if(element.address) {
                            marker.address = element.address;
                        }
                        if(element.description) {
                            marker.description = element.description;
                        }
                        if(element.title) {
                            marker.title = element.title;
                        }
                        if(element.price) {
                            marker.price = element.price;
                        }
                        if(element._id){
                            marker._id = element._id;
                        }

                        markers.push(marker);
                    });

                    res.end(JSON.stringify(markers));
                }
                else{
                    utils.send_error_json(res, "No announcements in database");
                }
            })
            .catch( err => {
                utils.send_error_json(res, 500, "Internal error!");
            })

    }

    //

    static init_routes(router) {

        router.get('/api/announcements', middlewares.get_querystring_data,this.getAnnouncements);
        router.get('/api/announcements/:id', this.getAnnouncementById);

        router.get('/api/markers', this.getMarkers);

        router.post('/api/announcements' , middlewares.login_required_api, middlewares.get_body_data, this.addAnnouncement);
        router.post('/api/announcementsForm' , middlewares.login_required_api, middlewares.get_form_data, this.addAnnouncement);

        router.delete('/api/announcements/:id', middlewares.login_required_api, this.deleteAnnouncement);

        router.put('/api/announcements/:id', middlewares.get_body_data, this.updateAnnouncement);

    }


}

module.exports = AnnouncementAPI;